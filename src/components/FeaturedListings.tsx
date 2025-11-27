import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Eye, Package, Heart, User, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ListingWithProfile {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[] | null;
  featured: boolean;
  view_count: number;
  user_id: string;
  seller_score?: number;
  username?: string;
  total_sales?: number;
  verified?: boolean;
}

const FeaturedListings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Check auth status
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user?.id || null);
    });
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      // Get listings
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);

      if (listingsError) throw listingsError;
      if (!listingsData) return [];

      // Get user profiles for these listings
      const userIds = listingsData.map(l => l.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, seller_score, total_sales, verified")
        .in("user_id", userIds);

      // Merge data
      const enrichedListings: ListingWithProfile[] = listingsData.map(listing => {
        const profile = profilesData?.find(p => p.user_id === listing.user_id);
        return {
          ...listing,
          username: profile?.username,
          seller_score: profile?.seller_score,
          total_sales: profile?.total_sales,
          verified: profile?.verified,
        };
      });

      return enrichedListings;
    },
  });

  // Get user's favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUser);
      return data?.map(f => f.listing_id) || [];
    },
    enabled: !!currentUser,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) => {
      if (!currentUser) throw new Error("Giriş yapmalısınız");
      
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", currentUser)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: currentUser, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Favori işlemi başarısız",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!currentUser) {
      toast({
        title: "Giriş Gerekli",
        description: "Favori eklemek için giriş yapmalısınız",
        variant: "destructive",
      });
      return;
    }
    const isFavorite = favorites.includes(listingId);
    toggleFavoriteMutation.mutate({ listingId, isFavorite });
  };

  const handleSellerClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    navigate(`/seller/${userId}`);
  };

  const handleBuyClick = (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    navigate(`/listing/${listingId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Henüz İlan Yok</h3>
        <p className="text-muted-foreground">İlk ilanı siz oluşturun!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {listings.map((listing) => {
        const isFavorite = favorites.includes(listing.id);
        
        return (
          <Card
            key={listing.id}
            onClick={() => navigate(`/listing/${listing.id}`)}
            className="group relative overflow-hidden border-border bg-card hover:border-brand-blue/50 hover:shadow-lg hover:shadow-brand-blue/20 transition-all duration-300 cursor-pointer animate-fade-in"
          >
            {/* Image with Overlay */}
            <div className="relative h-48 overflow-hidden">
              {listing.images && listing.images.length > 0 ? (
                <>
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-blue/10 to-primary/10 flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Featured Badge */}
              {listing.featured && (
                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-brand-blue to-primary shadow-lg backdrop-blur-sm">
                  <Star className="w-3 h-3 mr-1" />
                  Öne Çıkan
                </Badge>
              )}

              {/* Favorite Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => handleFavoriteClick(e, listing.id)}
                className={`absolute top-3 left-3 w-9 h-9 rounded-full backdrop-blur-md transition-all duration-300 ${
                  isFavorite 
                    ? "bg-red-500/90 hover:bg-red-600 text-white" 
                    : "bg-white/20 hover:bg-white/40 text-white opacity-0 group-hover:opacity-100"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>

              {/* Quick Action Buttons - Show on Hover */}
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Button
                  size="sm"
                  onClick={(e) => handleSellerClick(e, listing.user_id)}
                  className="flex-1 backdrop-blur-md bg-red-500 hover:bg-red-600 text-white shadow-lg"
                >
                  <User className="w-3 h-3 mr-1" />
                  Satıcı
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => handleBuyClick(e, listing.id)}
                  className="flex-1 bg-gradient-to-r from-brand-blue to-primary hover:opacity-90 shadow-lg"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Satın Al
                </Button>
              </div>
            </div>

            {/* Content */}
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base line-clamp-2 group-hover:text-brand-blue transition-colors">
                {listing.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-green/10">
                  <Star className="w-3 h-3 fill-success-green text-success-green" />
                  <span className="text-xs font-medium text-success-green">
                    {Number(listing.seller_score || 0).toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  @{listing.username || "kullanıcı"}
                  {(listing as any).verified && (
                    <img 
                      src="https://cdn.itemsatis.com/uploads/medals/60760ea5cd37a-medals-2644af7bc00efe5566a2154da9c32c4fc8f643fa.png" 
                      alt="Onaylı Satıcı"
                      className="w-4 h-4"
                      title="Onaylı Satıcı"
                    />
                  )}
                  {(listing as any).total_sales >= 5 && (
                    <img 
                      src="https://cdn.itemsatis.com/uploads/medals/alimmagaza.png" 
                      alt="5+ Satış Rozeti"
                      className="w-4 h-4"
                      title="5+ Başarılı Satış"
                    />
                  )}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">
                    ₺{Number(listing.price).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground px-2 py-1 rounded-lg bg-muted/50">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-xs">{listing.view_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FeaturedListings;
