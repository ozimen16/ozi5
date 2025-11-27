import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, FolderTree, Package, ShoppingCart, Images, Key, Wallet, Flag, Settings, HelpCircle, Ban, Lock } from "lucide-react";
import DashboardTab from "@/components/admin/DashboardTab";
import UsersTab from "@/components/admin/UsersTab";
import CategoriesTab from "@/components/admin/CategoriesTab";
import ListingsTab from "@/components/admin/ListingsTab";
import OrdersTab from "@/components/admin/OrdersTab";
import SlidersTab from "@/components/admin/SlidersTab";
import BalanceKeysTab from "@/components/admin/BalanceKeysTab";
import WithdrawalsTab from "@/components/admin/WithdrawalsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import SettingsTab from "@/components/admin/SettingsTab";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import IpBansTab from "@/components/admin/IpBansTab";

const ADMIN_PASSWORD = "notshop2025";
const ADMIN_EMAIL = "admin@panel.local";

const AdminPanel = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const checkAuth = async () => {
      const adminAuth = localStorage.getItem("admin_auth");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (adminAuth === "authenticated" && session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      toast({ title: "Hata", description: "Yanlış şifre", variant: "destructive" });
      return;
    }

    try {
      // Admin kullanıcısı ile Supabase'e giriş yap
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (error) {
        toast({ 
          title: "Hata", 
          description: "Admin girişi başarısız. Lütfen tekrar deneyin.",
          variant: "destructive" 
        });
        return;
      }

      localStorage.setItem("admin_auth", "authenticated");
      setIsAuthenticated(true);
      toast({ title: "Başarılı", description: "Admin paneline hoş geldiniz" });
    } catch (error) {
      toast({ 
        title: "Hata", 
        description: "Bir hata oluştu", 
        variant: "destructive" 
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    setPassword("");
    toast({ title: "Çıkış Yapıldı", description: "Admin panelinden çıkış yaptınız" });
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-glass-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="w-6 h-6 text-brand-blue" />
              Admin Paneli Girişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-password">Şifre</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin şifresini girin"
                  className="bg-dark-surface border-glass-border"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-brand-blue to-primary hover:opacity-90">
                Giriş Yap
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2"><span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">Admin Paneli</span></h1>
            <p className="text-muted-foreground">Tüm platform yönetim işlemlerini buradan gerçekleştirebilirsiniz</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <Lock className="w-4 h-4" />
            Çıkış Yap
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 lg:grid-cols-12 gap-2 h-auto bg-muted/50 p-2">
            <TabsTrigger value="dashboard" className="flex flex-col items-center gap-1 py-3"><LayoutDashboard className="h-4 w-4" /><span className="text-xs">Panel</span></TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col items-center gap-1 py-3"><Users className="h-4 w-4" /><span className="text-xs">Kullanıcılar</span></TabsTrigger>
            <TabsTrigger value="categories" className="flex flex-col items-center gap-1 py-3"><FolderTree className="h-4 w-4" /><span className="text-xs">Kategoriler</span></TabsTrigger>
            <TabsTrigger value="listings" className="flex flex-col items-center gap-1 py-3"><Package className="h-4 w-4" /><span className="text-xs">İlanlar</span></TabsTrigger>
            <TabsTrigger value="orders" className="flex flex-col items-center gap-1 py-3"><ShoppingCart className="h-4 w-4" /><span className="text-xs">Siparişler</span></TabsTrigger>
            <TabsTrigger value="sliders" className="flex flex-col items-center gap-1 py-3"><Images className="h-4 w-4" /><span className="text-xs">Slider</span></TabsTrigger>
            <TabsTrigger value="balance-keys" className="flex flex-col items-center gap-1 py-3"><Key className="h-4 w-4" /><span className="text-xs">Bakiye Key</span></TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex flex-col items-center gap-1 py-3"><Wallet className="h-4 w-4" /><span className="text-xs">Çekim</span></TabsTrigger>
            <TabsTrigger value="ip-bans" className="flex flex-col items-center gap-1 py-3"><Ban className="h-4 w-4" /><span className="text-xs">IP Yasakları</span></TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col items-center gap-1 py-3"><Flag className="h-4 w-4" /><span className="text-xs">Raporlar</span></TabsTrigger>
            <TabsTrigger value="support" className="flex flex-col items-center gap-1 py-3"><HelpCircle className="h-4 w-4" /><span className="text-xs">Destek</span></TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-3"><Settings className="h-4 w-4" /><span className="text-xs">Ayarlar</span></TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="listings"><ListingsTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="sliders"><SlidersTab /></TabsContent>
          <TabsContent value="balance-keys"><BalanceKeysTab /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
          <TabsContent value="ip-bans"><IpBansTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="support"><SupportTicketsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPanel;
