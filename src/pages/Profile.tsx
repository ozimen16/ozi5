import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Package, Wallet, LogOut, User, Camera, Edit, ShoppingCart } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["my-listings", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });
      return data;
    },
  });

  useEffect(() => {
    if (!session) {
      navigate("/auth");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      if (!profile) throw new Error("Profil bulunamadı");
      
      const isFirstChange = (profile.username_changes || 0) === 0;
      const currentBalance = profile.balance || 0;
      
      // İlk değişiklik değilse ve bakiye yeterli değilse hata
      if (!isFirstChange && currentBalance < 20) {
        throw new Error("Yetersiz bakiye. Kullanıcı adı değiştirmek için 20 TL gereklidir.");
      }

      // Bakiye düşür (ilk değişiklik değilse)
      if (!isFirstChange) {
        const { error: balanceError } = await supabase
          .from("profiles")
          .update({ balance: currentBalance - 20 })
          .eq("user_id", session!.user.id);
        
        if (balanceError) throw balanceError;
      }

      // Kullanıcı adını güncelle ve sayacı artır
      const { error } = await supabase
        .from("profiles")
        .update({ 
          username,
          username_changes: (profile.username_changes || 0) + 1
        })
        .eq("user_id", session!.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditingUsername(false);
      const isFirstChange = (profile?.username_changes || 0) === 0;
      toast({
        title: "Başarılı",
        description: isFirstChange 
          ? "Kullanıcı adınız güncellendi" 
          : "Kullanıcı adınız güncellendi. 20 TL bakiyenizden düşüldü.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Kullanıcı adı güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Başarılı",
        description: "Profil fotoğrafınız güncellendi",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Hata",
        description: "Profil fotoğrafı yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-brand-blue/10">
                        <User className="w-12 h-12 text-brand-blue" />
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isEditingUsername ? (
                    <div className="w-full max-w-xs space-y-2">
                      {profile && (profile.username_changes || 0) > 0 && (
                        <div className="p-2 bg-warning-orange/10 border border-warning-orange/20 rounded-lg">
                          <p className="text-xs text-warning-orange">
                            ⚠️ Kullanıcı adı değiştirme ücreti: 20 TL
                          </p>
                        </div>
                      )}
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Kullanıcı adı"
                        className="text-center"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateUsernameMutation.mutate(newUsername)}
                          disabled={updateUsernameMutation.isPending || !newUsername}
                        >
                          {(profile?.username_changes || 0) > 0 ? "Onayla ve Öde (20 TL)" : "Kaydet"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditingUsername(false);
                            setNewUsername(profile?.username || "");
                          }}
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl">{profile?.username || "Kullanıcı"}</h3>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setIsEditingUsername(true)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      {profile && (profile.username_changes || 0) === 0 && (
                        <p className="text-xs text-success-green">
                          ✓ İlk kullanıcı adı değişikliği ücretsiz
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground mb-3">{session?.user?.email}</p>
                  {profile?.verified && (
                    <Badge className="bg-success-green/10 text-success-green">
                      Doğrulanmış
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-glass-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-brand-blue mb-1">
                      <Star className="w-5 h-5 fill-brand-blue" />
                      {Number(profile?.seller_score || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Satıcı Puanı</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-blue mb-1">
                      {profile?.total_sales || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Toplam Satış</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="w-full justify-start border-brand-blue text-brand-blue hover:bg-brand-blue/10"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    İlanlarım
                  </Button>
                  <Button
                    onClick={() => navigate("/orders")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Siparişlerim
                  </Button>
                  <Button
                    onClick={() => navigate("/wallet")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Bakiye: ₺{Number(profile?.balance || 0).toFixed(2)}
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full justify-start text-danger-red hover:bg-danger-red/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Çıkış Yap
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity */}
          <div className="lg:col-span-2">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Son İlanlarım</CardTitle>
              </CardHeader>
              <CardContent>
                {listings && listings.length > 0 ? (
                  <div className="space-y-3">
                    {listings.slice(0, 5).map((listing) => (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-dark-surface/50 hover:bg-dark-surface transition-colors cursor-pointer"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{listing.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>₺{Number(listing.price).toFixed(2)}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {listing.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz ilan oluşturmadınız</p>
                    <Button
                      onClick={() => navigate("/create-listing")}
                      className="mt-4 bg-gradient-to-r from-brand-blue to-primary"
                    >
                      İlan Oluştur
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
