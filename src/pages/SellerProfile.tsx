import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, User, Package, Trophy, UserPlus, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(username, avatar_url),
          order:orders(listing:listings(title))
        `)
        .eq("reviewed_user_id", id)
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
      <div className="relative w-full h-64 bg-gradient-to-r from-brand-blue via-primary to-brand-blue overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579547945413-497e1b99dac0')] bg-cover bg-center opacity-30"></div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        <Card className="border-glass-border bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Section */}
              <div className="flex flex-col items-center md:items-start gap-4">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-brand-blue/10 text-3xl">
                    <User className="w-16 h-16 text-brand-blue" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">{profile.username}</h1>
                    {profile.verified && (
                      <CheckCircle className="w-6 h-6 text-success-green fill-success-green/20" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Üyelik Tarihi: {memberSince}
                  </p>
                  
                  {/* Badges */}
                  <div className="flex gap-2 mb-4">
                    {profile.verified && (
                      <Badge className="bg-success-green/10 text-success-green border-success-green/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Doğrulanmış
                      </Badge>
                    )}
                    {completedOrders > 50 && (
                      <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Trophy className="w-3 h-3 mr-1" />
                        Güvenilir Satıcı
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      className="bg-gradient-to-r from-brand-blue to-primary"
                      onClick={() => navigate(`/messages?user=${id}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Sohbet
                    </Button>
                    <Button variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Takip Et
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Rating */}
                <div className="text-center p-4 rounded-lg bg-dark-surface/50 border border-glass-border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    <span className="text-3xl font-bold text-yellow-400">{averageRating}</span>
                    <span className="text-muted-foreground">/10</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reviews?.length || 0} Değerlendirme
                  </p>
                </div>

                {/* Completed Orders */}
                <div className="text-center p-4 rounded-lg bg-dark-surface/50 border border-glass-border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package className="w-6 h-6 text-success-green" />
                    <span className="text-3xl font-bold text-success-green">{completedOrders}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Başarılı İşlem</p>
                </div>

                {/* Active Listings */}
                <div className="text-center p-4 rounded-lg bg-dark-surface/50 border border-glass-border col-span-2 md:col-span-1">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package className="w-6 h-6 text-brand-blue" />
                    <span className="text-3xl font-bold text-brand-blue">{listings?.length || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Aktif İlan</p>
                </div>
              </div>
            </div>

            {/* Verified Seller Badge */}
            {profile.verified && (
              <div className="mt-6 p-4 rounded-lg bg-success-green/5 border border-success-green/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success-green mt-1" />
                  <div>
                    <h3 className="font-semibold text-success-green mb-1">Kimlik Onaylı Satıcı</h3>
                    <p className="text-sm text-muted-foreground">
                      Bu üye Kimlik Onaylı Satıcı ünvanına sahip bir mağaza üyesidir.
                      Bu üyenin kimlik bilgileri sistemimizde kayıtlıdır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Hours */}
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Teslimat Saatleri: 12:00 - 00:00</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="listings" className="mt-8 mb-12">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 bg-card border border-glass-border">
            <TabsTrigger value="listings" className="gap-2">
              <Package className="w-4 h-4" />
              İlanlar ({listings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Değerlendirmeler ({reviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="w-4 h-4" />
              Başarımlar
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <User className="w-4 h-4" />
              Hakkında
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4 mt-6">
            {listings && listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card 
                    key={listing.id}
                    className="border-glass-border bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={listing.images?.[0] || "/placeholder.svg"}
                        alt={listing.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{listing.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-brand-blue">
                          ₺{Number(listing.price).toFixed(2)}
                        </span>
                        <Badge variant="outline">
                          Stok: {listing.stock || 0}
                        </Badge>
                      </div>
                    </CardContent>
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

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-6">
            {reviews && reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <Card key={review.id} className="border-glass-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={review.reviewer?.avatar_url} />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">{review.reviewer?.username || "Kullanıcı"}</p>
                              {review.order?.listing?.title && (
                                <p className="text-sm text-muted-foreground">
                                  {review.order.listing.title}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
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
                            {format(new Date(review.created_at), "d MMMM yyyy", { locale: tr })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Henüz değerlendirme yok</p>
                </CardContent>
              </Card>
            )}
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

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4 mt-6">
            <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Satıcı Hakkında</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {profile.description || "Bu satıcı henüz bir açıklama eklememis."}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Üyelik:</span>
                    <span className="font-medium">{memberSince}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Satış:</span>
                    <span className="font-medium">{completedOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ortalama Puan:</span>
                    <span className="font-medium">{averageRating} / 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aktif İlan:</span>
                    <span className="font-medium">{listings?.length || 0}</span>
                  </div>
                </div>
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
