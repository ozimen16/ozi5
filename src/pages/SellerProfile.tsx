import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, User, Package, Trophy, UserPlus, Clock, CheckCircle, ShieldCheck, Eye } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: followersCount } = useQuery({
    queryKey: ["followers-count", id],
    enabled: !!id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", id);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", id, session?.user?.id],
    enabled: !!id && !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", session!.user.id)
        .eq("following_id", id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) {
        throw new Error("Takip etmek için giriş yapmalısınız");
      }

      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", session.user.id)
          .eq("following_id", id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: session.user.id,
            following_id: id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", id] });
      queryClient.invalidateQueries({ queryKey: ["followers-count", id] });
      toast({
        title: "Başarılı",
        description: isFollowing ? "Takipten çıkıldı" : "Takip edildi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_user_id", id)
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

  const { data: announcements } = useQuery({
    queryKey: ["seller-announcements", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["seller-orders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "completed");
      
      if (error) throw error;
      return data;
    },
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Satıcı Bulunamadı</h1>
          <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const averageRating = reviews && reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const completedOrders = orders?.length || 0;
  const memberSince = format(new Date(profile.created_at), "d MMMM yyyy", { locale: tr });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover Image */}
      <div className="relative w-full h-64 overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        {profile.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            src="https://images.unsplash.com/photo-1579547945413-497e1b99dac0" 
            alt="Default Cover" 
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
        <Card className="border-glass-border bg-slate-900/95 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left Section - Profile Info */}
              <div className="flex flex-col items-center lg:items-start gap-4 lg:w-1/3">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-slate-800 shadow-2xl ring-2 ring-brand-blue/20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-primary text-3xl">
                      <User className="w-16 h-16 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  {completedOrders >= 10 && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-slate-900 border-4 border-slate-900 shadow-lg text-sm">
                      12
                    </div>
                  )}
                </div>
                
                <div className="text-center lg:text-left w-full">
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
                    {profile.verified && (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                        <img 
                          src="https://cdn.itemsatis.com/uploads/medals/60760ea5cd37a-medals-2644af7bc00efe5566a2154da9c32c4fc8f643fa.png" 
                          alt="Onaylı Satıcı"
                          className="w-6 h-6"
                          title="Onaylı Satıcı"
                        />
                      </>
                    )}
                    {(profile.total_sales || 0) >= 5 && (
                      <img 
                        src="https://cdn.itemsatis.com/uploads/medals/alimmagaza.png" 
                        alt="5+ Satış Rozeti"
                        className="w-6 h-6"
                        title="5+ Başarılı Satış"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Üyelik Tarihi: {memberSince}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-3">
                    <Button 
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => navigate(`/messages?user=${id}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Sohbet
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => followMutation.mutate()}
                      disabled={!session?.user?.id || followMutation.isPending}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {isFollowing ? "Takipten Çık" : "Takip Et"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Teslimat: {profile.delivery_hours || '12:00 - 00:00'}</span>
                  </div>
                </div>
              </div>

              {/* Right Section - Stats */}
              <div className="flex-1 w-full">
                <div className="flex justify-end mb-4">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      <span className="text-4xl font-bold text-yellow-400">{averageRating}</span>
                      <span className="text-xl text-slate-400 mt-1">/ 10</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Toplam {reviews?.length || 0} değerlendirme
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-base font-semibold"
                  size="default"
                >
                  {completedOrders} Başarılı İşlem
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 text-center">
                      <Package className="w-6 h-6 mx-auto mb-1 text-brand-blue" />
                      <p className="text-xl font-bold text-white">{listings?.length || 0}</p>
                      <p className="text-xs text-slate-400">İlanlar</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 text-center">
                      <Star className="w-6 h-6 mx-auto mb-1 text-yellow-400" />
                      <p className="text-xl font-bold text-white">{announcements?.length || 0}</p>
                      <p className="text-xs text-slate-400">Duyurular</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 text-center">
                      <MessageSquare className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                      <p className="text-xl font-bold text-white">{reviews?.length || 0}</p>
                      <p className="text-xs text-slate-400">Değerlendirmeler</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 text-center">
                      <UserPlus className="w-6 h-6 mx-auto mb-1 text-pink-400" />
                      <p className="text-xl font-bold text-white">{followersCount || 0}</p>
                      <p className="text-xs text-slate-400">Takipçiler</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Verified Seller Badge */}
            {profile.verified && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-400 mb-0.5 text-sm">Kimlik Onaylı Satıcı</h3>
                    <p className="text-xs text-slate-400">
                      Bu üye <strong>Kimlik Onaylı Satıcı</strong> ünvanına sahiptir.
                      Kimlik bilgileri sistemimizde kayıtlıdır.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="listings" className="mt-8 mb-12">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-slate-900/90 border border-slate-700">
            <TabsTrigger value="listings" className="gap-2 data-[state=active]:bg-brand-blue">
              <Package className="w-4 h-4" />
              İlanlar
              <Badge variant="secondary" className="ml-1 bg-slate-700">
                {listings?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2 data-[state=active]:bg-brand-blue">
              <MessageSquare className="w-4 h-4" />
              Duyurular
              <Badge variant="secondary" className="ml-1 bg-slate-700">
                {announcements?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2 data-[state=active]:bg-brand-blue">
              <Star className="w-4 h-4" />
              Değerlendirmeler
              <Badge variant="secondary" className="ml-1 bg-slate-700">
                {reviews?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2 data-[state=active]:bg-brand-blue">
              <Trophy className="w-4 h-4" />
              Başarımlar
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-2 data-[state=active]:bg-brand-blue">
              <UserPlus className="w-4 h-4" />
              Takipçiler
              <Badge variant="secondary" className="ml-1 bg-slate-700">
                {followersCount || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4 mt-6">
            {listings && listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((listing) => (
                  <Card
                    key={listing.id}
                    onClick={() => navigate(`/listing/${listing.id}`)}
                    className="group relative overflow-hidden border-glass-border bg-card/50 backdrop-blur-sm hover:border-neon-blue/50 transition-all cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-blue/10 to-primary/10 flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      {listing.featured && (
                        <Badge className="absolute top-2 right-2 bg-gradient-to-r from-brand-blue to-primary shadow-glow-blue">
                          Öne Çıkan
                        </Badge>
                      )}
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 fill-success-green text-success-green" />
                        <span>{Number(profile?.seller_score || 0).toFixed(2)}</span>
                        <span className="text-xs">
                          @{profile?.username || "kullanıcı"}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-brand-blue">
                          ₺{Number(listing.price).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          <span>{listing.view_count}</span>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-4 pt-0">
                      <Button className="w-full bg-gradient-to-r from-brand-blue to-primary hover:opacity-90 shadow-md">
                        Satın Al
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Bu satıcının aktif ilanı bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4 mt-6">
            {announcements && announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement: any) => (
                  <Card key={announcement.id} className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg text-white mb-2">{announcement.title}</h3>
                      <p className="text-sm text-slate-300 mb-3">{announcement.content}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(announcement.created_at), "d MMMM yyyy HH:mm", { locale: tr })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Henüz duyuru yok</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-6">
            {reviews && reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <Card key={review.id} className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12 border-2 border-slate-700">
                          <AvatarImage src={review.reviewer?.avatar_url} />
                          <AvatarFallback className="bg-slate-700">
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-white">{review.reviewer?.username || "Kullanıcı"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-600"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-slate-300 mb-2">
                              {review.comment}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {format(new Date(review.created_at), "d MMMM yyyy", { locale: tr })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Henüz değerlendirme yok</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers" className="space-y-4 mt-6">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Takipçi listesi</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4 mt-6">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Başarımlar
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {completedOrders >= 10 && (
                  <div className="p-4 rounded-lg bg-dark-surface/50 border border-glass-border text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                    <p className="font-semibold mb-1">İlk 10 Satış</p>
                    <p className="text-xs text-muted-foreground">10+ başarılı işlem</p>
                  </div>
                )}
                {completedOrders >= 50 && (
                  <div className="p-4 rounded-lg bg-dark-surface/50 border border-glass-border text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-brand-blue" />
                    <p className="font-semibold mb-1">Güvenilir Satıcı</p>
                    <p className="text-xs text-muted-foreground">50+ başarılı işlem</p>
                  </div>
                )}
                {Number(averageRating) >= 9 && (
                  <div className="p-4 rounded-lg bg-dark-surface/50 border border-glass-border text-center">
                    <Star className="w-12 h-12 mx-auto mb-2 text-yellow-400 fill-yellow-400" />
                    <p className="font-semibold mb-1">Yüksek Puanlı</p>
                    <p className="text-xs text-muted-foreground">9+ ortalama puan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default SellerProfile;
