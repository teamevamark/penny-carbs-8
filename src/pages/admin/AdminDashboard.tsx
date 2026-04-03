import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDeliveryAlerts } from '@/hooks/useDeliveryNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UnacceptedOrdersAlert from '@/components/admin/UnacceptedOrdersAlert';
import { Switch } from '@/components/ui/switch';
import { useServiceModules, useToggleServiceModule } from '@/hooks/useServiceModules';
import { 
  CalendarHeart,
  ChefHat,
  Home,
  Settings,
  Users,
  MapPin,
  Image,
  BarChart3,
  LogOut,
  ArrowLeft,
  Truck,
  ClipboardList,
  Tag,
  Utensils,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { 
    unacceptedOrders, 
    showAdminAlert, 
    dismissAdminAlert, 
    removeAdminAlert 
  } = useAdminDeliveryAlerts();

  const isAdmin = role === 'super_admin' || role === 'admin';
  const { data: serviceModules } = useServiceModules();
  const toggleModule = useToggleServiceModule();

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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const modules = [
    {
      id: 'indoor-events',
      title: 'Indoor Events Management',
      description: 'Manage event bookings, planning requests, quotations, cook assignments, and commission tracking',
      icon: CalendarHeart,
      path: '/admin/indoor-events',
      gradient: 'from-indoor-events to-indoor-events/70',
      features: ['Event Bookings', 'Planning Requests', 'Cook Assignment', 'Commission Tracking']
    },
    {
      id: 'cloud-kitchen',
      title: 'Cloud Kitchen Management',
      description: 'Time-slot based menu control, live orders, cook & delivery assignments, and performance reports',
      icon: ChefHat,
      path: '/admin/cloud-kitchen',
      gradient: 'from-cloud-kitchen to-cloud-kitchen/70',
      features: ['Time-Slot Menus', 'Live Orders', 'Cook Management', 'Sales Reports']
    },
    {
      id: 'home-delivery',
      title: 'Home Food Delivery Management',
      description: 'Instant orders, auto ETA, delivery assignments, cash collection, and settlement tracking',
      icon: Home,
      path: '/admin/home-delivery',
      gradient: 'from-homemade to-homemade/70',
      features: ['Instant Orders', 'Delivery Tracking', 'Cash Settlement', 'Ward Reports']
    }
  ];

  const commonUtilities = [
    { icon: ClipboardList, label: 'All Orders', path: '/admin/orders', description: 'Order History' },
    { icon: FolderOpen, label: 'Categories', path: '/admin/categories', description: 'Dish Categories' },
    { icon: Utensils, label: 'Food Items', path: '/admin/items', description: 'Manage Dishes' },
    { icon: ChefHat, label: 'Cook Management', path: '/admin/cooks', description: 'Add & Manage Cooks' },
    { icon: Truck, label: 'Delivery Staff', path: '/admin/delivery-staff', description: 'Manage Delivery' },
    { icon: ClipboardList, label: 'Work Assignment', path: '/admin/work-assignment', description: 'Assign Orders' },
    { icon: Users, label: 'User Management', path: '/admin/users', description: 'Customers & Staff' },
    { icon: MapPin, label: 'Locations', path: '/admin/locations', description: 'Panchayats & Wards' },
    { icon: Image, label: 'Banners', path: '/admin/banners', description: 'Promotions' },
    { icon: Tag, label: 'Special Offers', path: '/admin/special-offers', description: 'Offer Cards' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports', description: 'Analytics' },
  ];

  const superAdminUtilities = [
    { icon: Settings, label: 'Admin Management', path: '/admin/admins', description: 'Roles & Permissions' },
    { icon: Image, label: 'Storage Settings', path: '/admin/storage-settings', description: 'External Storage' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Unaccepted Orders Alert for Admin */}
      <UnacceptedOrdersAlert
        open={showAdminAlert}
        orders={unacceptedOrders}
        onDismiss={dismissAdminAlert}
        onRemove={removeAdminAlert}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-semibold">Admin Panel</h1>
            {unacceptedOrders.length > 0 && (
              <Badge 
                variant="destructive" 
                className="animate-pulse cursor-pointer"
                onClick={() => dismissAdminAlert()}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {unacceptedOrders.length} Unassigned
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 pb-20">
        {/* Welcome Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Welcome, {profile?.name || 'Admin'}!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a module to manage your Penny Carbs operations
            </p>
          </CardContent>
        </Card>

        {/* Module Cards */}
        <h3 className="mb-4 text-lg font-semibold">Operational Modules</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const serviceTypeMap: Record<string, string> = {
              'indoor-events': 'indoor_events',
              'cloud-kitchen': 'cloud_kitchen',
              'home-delivery': 'homemade',
            };
            const svcType = serviceTypeMap[module.id];
            const svcModule = serviceModules?.find((m) => m.service_type === svcType);
            const isActive = svcModule?.is_active ?? true;

            return (
              <Card 
                key={module.id}
                className={`transition-all hover:shadow-md ${!isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div 
                    className={`rounded-xl bg-gradient-to-br ${module.gradient} p-3 text-white cursor-pointer`}
                    onClick={() => navigate(module.path)}
                  >
                    <module.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(module.path)}>
                    <h4 className="font-medium">{module.title}</h4>
                    <p className="text-sm text-muted-foreground">{module.description.split(',')[0]}</p>
                  </div>
                  {role === 'super_admin' && svcModule && (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        toggleModule.mutate({ id: svcModule.id, is_active: checked })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Common Utilities */}
        <h3 className="mb-4 mt-8 text-lg font-semibold">Common Utilities</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {commonUtilities.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium">{item.label}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {role === 'super_admin' && superAdminUtilities.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer border-destructive/20 transition-all hover:shadow-md"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-destructive/10 p-3 text-destructive">
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
