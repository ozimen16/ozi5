import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ban, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const IpBansTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [reason, setReason] = useState("");

  const { data: ipBans, isLoading } = useQuery({
    queryKey: ["ip-bans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ip_bans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addBanMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("ip_bans")
        .insert({
          ip_address: ipAddress,
          reason,
          banned_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "IP adresi banlandı",
      });
      queryClient.invalidateQueries({ queryKey: ["ip-bans"] });
      setDialogOpen(false);
      setIpAddress("");
      setReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeBanMutation = useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase
        .from("ip_bans")
        .delete()
        .eq("id", banId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "IP banı kaldırıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["ip-bans"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>IP Yasakları</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni IP Yasağı
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>IP Adresi Banla</DialogTitle>
                  <DialogDescription>
                    Belirli bir IP adresini sistemden yasakla
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ip-address">IP Adresi</Label>
                    <Input
                      id="ip-address"
                      type="text"
                      placeholder="Örn: 192.168.1.1"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Banlama Nedeni</Label>
                    <Input
                      id="reason"
                      type="text"
                      placeholder="Banlama nedeni"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!ipAddress) {
                        toast({
                          title: "Hata",
                          description: "IP adresi girin",
                          variant: "destructive",
                        });
                        return;
                      }
                      addBanMutation.mutate();
                    }}
                    disabled={addBanMutation.isPending}
                  >
                    Banla
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Adresi</TableHead>
                  <TableHead>Sebep</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipBans && ipBans.length > 0 ? (
                  ipBans.map((ban) => {
                    const isActive = !ban.expires_at || new Date(ban.expires_at) > new Date();
                    return (
                      <TableRow key={ban.id}>
                        <TableCell className="font-mono">{ban.ip_address}</TableCell>
                        <TableCell>{ban.reason || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(ban.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="destructive">
                              <Ban className="w-3 h-3 mr-1" />
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Süresi Dolmuş</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeBanMutation.mutate(ban.id)}
                            disabled={removeBanMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Hiç IP yasağı yok
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IpBansTab;
