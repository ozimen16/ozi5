import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Camera, Clock, Image as ImageIcon, ArrowLeft, Save, Plus, Trash2, MessageSquare } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const EditSellerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [description, setDescription] = useState("");
  const [deliveryHours, setDeliveryHours] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

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

  const { data: announcements } = useQuery({
    queryKey: ["my-announcements", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
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
    if (profile?.description) {
      setDescription(profile.description);
    }
    if (profile?.delivery_hours) {
      setDeliveryHours(profile.delivery_hours);
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setIsUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
 
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
 
      if (uploadError) throw uploadError;
 
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Başarılı", description: "Profil fotoğrafı güncellendi" });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setIsUploadingCover(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `cover-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
 
    try {
       const { error: uploadError } = await supabase.storage
         .from("avatars")
         .upload(filePath, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       const { data: { publicUrl } } = supabase.storage
         .from("avatars")
         .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: publicUrl })
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Başarılı", description: "Kapak fotoğrafı güncellendi" });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Oturum bulunamadı");

      const { error } = await supabase
        .from("profiles")
        .update({
          description,
          delivery_hours: deliveryHours,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Profil güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/profile");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Oturum bulunamadı");

      const { error } = await supabase
        .from("announcements")
        .insert({
          user_id: session.user.id,
          title: announcementTitle,
          content: announcementContent,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Duyuru eklendi" });
      setIsAnnouncementDialogOpen(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Duyuru silindi" });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>

          <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Satıcı Profili Düzenle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-background">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-brand-blue/10">
                      <User className="w-16 h-16 text-brand-blue" />
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-xl">{profile?.username}</h3>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>

              {/* Cover Photo */}
              <div>
                <Label className="mb-2 block text-base font-semibold">Kapak Fotoğrafı</Label>
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-800 border border-glass-border">
                  {profile?.cover_url ? (
                    <img 
                      src={profile.cover_url} 
                      alt="Cover" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-16 h-16" />
                    </div>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  <Button
                    size="sm"
                    className="absolute bottom-4 right-4"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isUploadingCover ? "Yükleniyor..." : "Kapak Fotoğrafı Değiştir"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Önerilen boyut: 1200x400 piksel
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-base font-semibold mb-2 block">
                  Mağaza Açıklaması
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mağazanız hakkında bilgi verin, müşterilerinize kendinizi tanıtın..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {description.length}/500 karakter
                </p>
              </div>

              {/* Delivery Hours */}
              <div>
                <Label htmlFor="delivery_hours" className="text-base font-semibold mb-2 block">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Teslimat Saatleri
                </Label>
                <Input
                  id="delivery_hours"
                  value={deliveryHours}
                  onChange={(e) => setDeliveryHours(e.target.value)}
                  placeholder="Örn: 12:00 - 00:00"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Müşterilerinize ne zaman sipariş teslim edebileceğinizi belirtin
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-brand-blue to-primary"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  size="lg"
                >
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Announcements Management */}
          <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Duyurularım
                </CardTitle>
                <Button
                  onClick={() => setIsAnnouncementDialogOpen(true)}
                  className="bg-gradient-to-r from-brand-blue to-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Duyuru
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((announcement: any) => (
                    <Card key={announcement.id} className="border-glass-border bg-dark-surface/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{announcement.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {announcement.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(announcement.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger-red hover:text-danger-red"
                            onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz duyuru eklemediniz</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Announcement Dialog */}
      <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Duyuru Ekle</DialogTitle>
            <DialogDescription>
              Müşterilerinizle paylaşmak istediğiniz önemli bilgileri duyuru olarak ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcement-title">Duyuru Başlığı</Label>
              <Input
                id="announcement-title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Örn: Yeni ürünler eklendi!"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="announcement-content">Duyuru İçeriği</Label>
              <Textarea
                id="announcement-content"
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Duyuru detaylarını yazın..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {announcementContent.length}/500 karakter
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createAnnouncementMutation.mutate()}
                disabled={!announcementTitle || !announcementContent || createAnnouncementMutation.isPending}
                className="flex-1 bg-gradient-to-r from-brand-blue to-primary"
              >
                {createAnnouncementMutation.isPending ? "Ekleniyor..." : "Duyuru Ekle"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAnnouncementDialogOpen(false)}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default EditSellerProfile;
