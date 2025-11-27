import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Shield, ShieldCheck, User, Wallet, Ban } from "lucide-react";

const UsersTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banIpAddress, setBanIpAddress] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Get all profiles with user data
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

      // Get all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Merge data
      const usersWithData = (profiles || []).map((profile) => {
        const role = allRoles?.find((r) => r.user_id === profile.user_id);
        
        return {
          id: profile.user_id,
          email: profile.user_id, // We don't have email in profiles, so we use user_id
          created_at: profile.created_at,
          ...profile,
          user_roles: role || { role: "user" },
        };
      });

      return usersWithData;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "user" }) => {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role } as any)
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role } as any);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı rolü güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      const currentBalance = profile?.balance || 0;
      const newBalance = currentBalance + amount;

      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", userId);

      if (error) throw error;
      return newBalance;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı bakiyesi güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBalanceDialogOpen(false);
      setBalanceAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ verified: !verified })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kullanıcı onay durumu güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const banIpMutation = useMutation({
    mutationFn: async ({ ipAddress, reason }: { ipAddress: string; reason: string }) => {
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
      setBanDialogOpen(false);
      setBanReason("");
      setBanIpAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadge = (roles: any) => {
    if (!roles) {
      return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Kullanıcı</Badge>;
    }
    
    const role = roles.role;
    
    if (role === "admin") {
      return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (role === "moderator") {
      return <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" />Moderatör</Badge>;
    }
    return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Kullanıcı</Badge>;
  };

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
          <CardTitle>Kullanıcı Yönetimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı adı veya telefon ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Bakiye</TableHead>
                  <TableHead>Satış Puanı</TableHead>
                  <TableHead>Toplam Satış</TableHead>
                  <TableHead>Onay Durumu</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username || "Kullanıcı"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.balance?.toFixed(2)} ₺</TableCell>
                      <TableCell>{user.seller_score?.toFixed(1) || 0}</TableCell>
                      <TableCell>{user.total_sales || 0}</TableCell>
                      <TableCell>
                        {user.verified ? (
                          <Badge className="bg-green-500">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Onaylı
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Onaysız
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.user_roles)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={user.verified ? "outline" : "default"}
                            onClick={() => {
                              toggleVerifyMutation.mutate({
                                userId: user.id,
                                verified: user.verified || false,
                              });
                            }}
                            className={user.verified ? "" : "bg-green-600 hover:bg-green-700"}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                          <Select
                            defaultValue={user.user_roles?.role || "user"}
                            onValueChange={(value: "admin" | "moderator" | "user") =>
                              updateRoleMutation.mutate({
                                userId: user.id,
                                role: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Kullanıcı</SelectItem>
                              <SelectItem value="moderator">Moderatör</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setBalanceDialogOpen(true);
                            }}
                          >
                            <Wallet className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setBanIpAddress("");
                              setBanDialogOpen(true);
                            }}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Kullanıcı bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Balance Update Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakiye Güncelle</DialogTitle>
            <DialogDescription>
              {selectedUser?.username} için bakiye ekle veya çıkar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mevcut Bakiye</Label>
              <p className="text-2xl font-bold">{selectedUser?.balance?.toFixed(2)} ₺</p>
            </div>
            <div>
              <Label htmlFor="balance-amount">Miktar (+ veya -)</Label>
              <Input
                id="balance-amount"
                type="number"
                placeholder="Örn: 100 veya -50"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Pozitif sayı ekler, negatif sayı çıkarır
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => {
                const amount = parseFloat(balanceAmount);
                if (isNaN(amount)) {
                  toast({
                    title: "Hata",
                    description: "Geçerli bir miktar girin",
                    variant: "destructive",
                  });
                  return;
                }
                updateBalanceMutation.mutate({
                  userId: selectedUser.id,
                  amount,
                });
              }}
              disabled={updateBalanceMutation.isPending}
            >
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IP Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IP Adresi Banla</DialogTitle>
            <DialogDescription>
              {selectedUser?.username} kullanıcısını IP adresi ile banla
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ip-address">IP Adresi</Label>
              <Input
                id="ip-address"
                type="text"
                placeholder="Örn: 192.168.1.1"
                value={banIpAddress}
                onChange={(e) => setBanIpAddress(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Kullanıcının IP adresini girin
              </p>
            </div>
            <div>
              <Label htmlFor="ban-reason">Banlama Nedeni</Label>
              <Input
                id="ban-reason"
                type="text"
                placeholder="Banlama nedeni"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!banIpAddress) {
                  toast({
                    title: "Hata",
                    description: "IP adresi girin",
                    variant: "destructive",
                  });
                  return;
                }
                banIpMutation.mutate({
                  ipAddress: banIpAddress,
                  reason: banReason,
                });
              }}
              disabled={banIpMutation.isPending}
            >
              Banla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab;
