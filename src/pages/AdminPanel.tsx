import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, FolderTree, Package, ShoppingCart, Images, Key, Wallet, Flag, Settings, HelpCircle, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const AdminPanel = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Hardcoded credentials - SECURITY WARNING: This is not secure!
  const ADMIN_USERNAME = "notshop2025";
  const ADMIN_PASSWORD = "notshop2025";

  useState(() => {
    // Check if already logged in
    const adminAuth = localStorage.getItem("admin_auth");
    if (adminAuth === "authenticated") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_auth", "authenticated");
      setIsAuthenticated(true);
      toast({ title: "Başarılı", description: "Admin paneline hoş geldiniz" });
    } else {
      toast({ 
        title: "Hata", 
        description: "Kullanıcı adı veya şifre hatalı", 
        variant: "destructive" 
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    toast({ title: "Çıkış Yapıldı", description: "Admin panelinden çıkış yaptınız" });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Paneli Girişi</CardTitle>
            <CardDescription>Devam etmek için giriş yapın</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Giriş Yap</Button>
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
          <Button onClick={handleLogout} variant="outline">Çıkış Yap</Button>
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
