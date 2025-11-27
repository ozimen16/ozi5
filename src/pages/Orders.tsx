import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, AlertCircle, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Alıcı olarak siparişler
  const { data: buyerOrders, isLoading: buyerLoading } = useQuery({
    queryKey: ["buyer-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          listings (title, price, images),
          profiles!orders_seller_id_fkey (username),
          reviews!reviews_order_id_fkey (id)
        `)
        .eq("buyer_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Satıcı olarak siparişler
  const { data: sellerOrders, isLoading: sellerLoading } = useQuery({
    queryKey: ["seller-orders", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          listings (title, price, images),
          profiles!orders_buyer_id_fkey (username)
        `)
        .eq("seller_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Sipariş onaylandı" });
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id || !selectedOrder) throw new Error("Oturum bulunamadı");

      const { error } = await supabase.from("reports").insert({
        reporter_id: session.user.id,
        order_id: selectedOrder.id,
        reason: reportReason,
        details: reportDetails,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "İade talebi oluşturuldu" });
      setIsReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id || !selectedOrder) throw new Error("Oturum bulunamadı");

      const { error } = await supabase.from("reviews").insert({
        order_id: selectedOrder.id,
        reviewer_id: session.user.id,
        reviewed_user_id: selectedOrder.seller_id,
        rating: rating,
        comment: comment || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Değerlendirme gönderildi" });
      setIsReviewDialogOpen(false);
      setRating(0);
      setComment("");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (!session) {
    navigate("/auth");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      paid: "default",
      delivered: "outline",
      completed: "default",
      disputed: "destructive",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Beklemede",
      paid: "Ödendi",
      delivered: "Teslim Edildi",
      completed: "Tamamlandı",
      disputed: "İhtilaf",
      cancelled: "İptal",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const OrderCard = ({ order, isSeller }: { order: any; isSeller: boolean }) => (
    <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {order.listings?.images?.[0] && (
            <img
              src={order.listings.images[0]}
              alt={order.listings.title}
              className="w-24 h-24 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{order.listings?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {isSeller ? "Alıcı" : "Satıcı"}: {order.profiles?.username}
                </p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Sipariş No: <span className="font-mono">{order.id.slice(0, 8)}</span>
              </p>
              <p className="text-lg font-bold text-brand-blue">{order.price} ₺</p>
              <p className="text-muted-foreground">
                Tarih: {new Date(order.created_at).toLocaleDateString("tr-TR")}
              </p>
              {order.delivery_note && (
                <p className="text-sm mt-2 p-2 bg-muted rounded">
                  <strong>Teslimat Notu:</strong> {order.delivery_note}
                </p>
              )}
            </div>

            {!isSeller && order.status !== "pending" && order.status !== "cancelled" && order.status !== "disputed" && (
              <div className="space-y-2 mt-4">
                <div className="flex gap-2">
                  {order.status !== "completed" && (
                    <Button
                      onClick={() => confirmOrderMutation.mutate(order.id)}
                      className="flex-1 bg-gradient-to-r from-success-green to-brand-blue"
                    >
                      Siparişi Onayla
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsReportDialogOpen(true);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    İade Talebi
                  </Button>
                </div>
                {order.status === "completed" && !order.reviews?.length && (
                  <Button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsReviewDialogOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-brand-blue to-primary"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Satıcıyı Değerlendir
                  </Button>
                )}
                {order.status === "completed" && order.reviews?.length > 0 && (
                  <div className="w-full p-2 bg-success-green/10 border border-success-green/30 rounded text-center text-sm text-success-green">
                    ✓ Değerlendirme yapıldı
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">
          <span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">
            Siparişlerim
          </span>
        </h1>

        <Tabs defaultValue="buyer" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="buyer" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Aldıklarım
            </TabsTrigger>
            <TabsTrigger value="seller" className="gap-2">
              <Package className="w-4 h-4" />
              Sattıklarım
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buyer" className="space-y-4">
            {buyerLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : buyerOrders && buyerOrders.length > 0 ? (
              buyerOrders.map((order) => (
                <OrderCard key={order.id} order={order} isSeller={false} />
              ))
            ) : (
              <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Henüz sipariş vermediniz</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="seller" className="space-y-4">
            {sellerLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sellerOrders && sellerOrders.length > 0 ? (
              sellerOrders.map((order) => (
                <OrderCard key={order.id} order={order} isSeller={true} />
              ))
            ) : (
              <Card className="border-glass-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Henüz satış yapmadınız</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* İade Talebi Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İade Talebi Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Sebep</Label>
              <select
                id="reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 bg-dark-surface border border-glass-border rounded-md"
              >
                <option value="">Seçiniz</option>
                <option value="Ürün açıklamaya uymuyor">Ürün açıklamaya uymuyor</option>
                <option value="Ürün hasarlı/kusurlu">Ürün hasarlı/kusurlu</option>
                <option value="Yanlış ürün gönderildi">Yanlış ürün gönderildi</option>
                <option value="Teslimat yapılmadı">Teslimat yapılmadı</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div>
              <Label htmlFor="details">Detaylar</Label>
              <Textarea
                id="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Lütfen sorunu detaylı açıklayın..."
                className="bg-dark-surface border-glass-border"
                rows={4}
              />
            </div>
            <Button
              onClick={() => createReportMutation.mutate()}
              disabled={!reportReason || !reportDetails}
              className="w-full bg-gradient-to-r from-warning-orange to-error-red"
            >
              Talebi Gönder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Değerlendirme Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satıcıyı Değerlendir</DialogTitle>
            <DialogDescription>
              Bu siparişle ilgili deneyiminizi değerlendirin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Puanınız (1-10)</Label>
              <div className="flex gap-2 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRating(score)}
                    className={`w-12 h-12 rounded-lg font-bold transition-all hover:scale-110 ${
                      score <= rating
                        ? "bg-yellow-400 text-slate-900"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Seçilen puan: {rating}/10
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="comment">Yorumunuz (isteğe bağlı)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deneyiminizi paylaşın..."
                className="bg-dark-surface border-glass-border"
                rows={4}
              />
            </div>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={rating === 0 || reviewMutation.isPending}
              className="w-full bg-gradient-to-r from-brand-blue to-primary"
            >
              Değerlendirmeyi Gönder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Orders;
