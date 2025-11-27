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

  const { data: reviews } = useQuery({
    queryKey: ["reviews", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_user_id", session!.user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch related data separately
      if (data && data.length > 0) {
        const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", reviewerIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        return data.map(review => ({
          ...review,
          reviewer: profileMap.get(review.reviewer_id)
        }));
      }
      
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
 
  const { data: sellerOrders } = useQuery({
    queryKey: ["seller-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", session!.user.id)
        .in("status", ["paid", "delivered", "completed"]);
 
      if (error) throw error;
      return data;
    },
  });
 
  const { data: buyerOrders } = useQuery({
    queryKey: ["buyer-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", session!.user.id)
        .not("status", "eq", "cancelled");
 
      if (error) throw error;
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
      let errorMessage = "Kullanıcı adı güncellenemedi";
      
      // Check for duplicate username error
      if (error.message?.includes("duplicate key") || error.message?.includes("profiles_username_key")) {
        errorMessage = "Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı deneyin.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Hata",
        description: errorMessage,
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
                        {profile?.verified && (
                          <img 
                            src="https://cdn.itemsatis.com/uploads/medals/60760ea5cd37a-medals-2644af7bc00efe5566a2154da9c32c4fc8f643fa.png" 
                            alt="Onaylı Satıcı"
                            className="w-6 h-6"
                            title="Onaylı Satıcı"
                          />
                        )}
                        {(profile?.total_sales || 0) >= 5 && (
                          <img 
                            src="https://cdn.itemsatis.com/uploads/medals/alimmagaza.png" 
                            alt="5+ Satış Rozeti"
                            className="w-6 h-6"
                            title="5+ Başarılı Satış"
                          />
                        )}
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
                    onClick={() => navigate("/edit-seller-profile")}
                    variant="outline"
                    className="w-full justify-start border-brand-blue text-brand-blue hover:bg-brand-blue/10"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Satıcı Profilini Düzenle
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="w-full justify-start"
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
                    onClick={() => navigate("/withdraw")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Para Çek
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

          {/* Account Summary */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Hesap Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-surface/60 border border-glass-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Hesap Bakiyesi</span>
                      <span className="text-xl font-bold">
                        {Number(profile?.balance || 0).toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-surface/60 border border-glass-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Satılan Toplam İlan</span>
                      <span className="text-xl font-bold">
                        {sellerOrders?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-surface/60 border border-glass-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Toplam Kazanç</span>
                      <span className="text-xl font-bold">
                        {`${(sellerOrders || []).reduce((sum, order) => sum + Number(order.price || 0) - Number(order.commission || 0), 0).toFixed(2)} TL`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-surface/60 border border-glass-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Toplam Harcama Tutarı</span>
                      <span className="text-xl font-bold">
                        {`${(buyerOrders || []).reduce((sum, order) => sum + Number(order.price || 0), 0).toFixed(2)} TL`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
 
            {/* Activity */}
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

            {/* Reviews Section */}
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Aldığım Değerlendirmeler
                </CardTitle>
                {reviews && reviews.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {reviews.length} değerlendirme • Ortalama: {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} ⭐
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div
                        key={review.id}
                        className="border border-glass-border rounded-lg p-4 bg-dark-surface/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={review.reviewer?.avatar_url} />
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {review.reviewer?.username || "Kullanıcı"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-foreground/80 mb-2">
                            {review.comment}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Henüz değerlendirme almadınız
                  </p>
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
