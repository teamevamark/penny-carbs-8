import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Users, 
  UtensilsCrossed, 
  ShoppingBag, 
  Truck, 
  BarChart3,
  Settings,
  MapPin,
  LogOut,
  ChefHat,
  Image
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  // Check if user has admin access
  const isAdmin = role === 'super_admin' || role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-center text-muted-foreground">
          You don't have permission to access this page
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </div>
    );
  }

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/admin', 
      color: 'bg-primary/10 text-primary',
      description: 'Overview & Statistics'
    },
    { 
      icon: ShoppingBag, 
      label: 'Orders', 
      path: '/admin/orders', 
      color: 'bg-warning/10 text-warning',
      description: 'Manage all orders'
    },
    { 
      icon: UtensilsCrossed, 
      label: 'Food Items', 
      path: '/admin/items', 
      color: 'bg-success/10 text-success',
      description: 'Menu management'
    },
    { 
      icon: Image, 
      label: 'Banners', 
      path: '/admin/banners', 
      color: 'bg-purple-500/10 text-purple-600',
      description: 'Homepage carousel'
    },
    { 
      icon: Users, 
      label: 'Users', 
      path: '/admin/users', 
      color: 'bg-cloud-kitchen/10 text-cloud-kitchen',
      description: 'Customers & Staff'
    },
    { 
      icon: ChefHat, 
      label: 'Cooks', 
      path: '/admin/cooks', 
      color: 'bg-amber-500/10 text-amber-600',
      description: 'Food Partners'
    },
    { 
      icon: Truck, 
      label: 'Delivery Staff', 
      path: '/admin/delivery-staff', 
      color: 'bg-indoor-events/10 text-indoor-events',
      description: 'Delivery partners'
    },
    { 
      icon: MapPin, 
      label: 'Locations', 
      path: '/admin/locations', 
      color: 'bg-homemade/10 text-homemade',
      description: 'Panchayats & Wards'
    },
    { 
      icon: BarChart3, 
      label: 'Reports', 
      path: '/admin/reports', 
      color: 'bg-accent/10 text-accent',
      description: 'Analytics & Reports'
    },
  ];

  // Super admin only items
  const superAdminItems = [
    { 
      icon: Settings, 
      label: 'Admin Management', 
      path: '/admin/admins', 
      color: 'bg-destructive/10 text-destructive',
      description: 'Manage admin users'
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-lg font-semibold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">
                {role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4">
        {/* Welcome Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Welcome, {profile?.name || 'Admin'}!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your Penny Carbs operations from here
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground">Today's Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">0</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">₹0</p>
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-cloud-kitchen">0</p>
              <p className="text-xs text-muted-foreground">Active Items</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu Grid */}
        <h3 className="mb-4 font-semibold">Management</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-xl p-3 ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium">{item.label}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {role === 'super_admin' && superAdminItems.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer border-destructive/20 transition-all hover:shadow-md"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-xl p-3 ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium">{item.label}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
