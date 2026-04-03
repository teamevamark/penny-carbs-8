import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Image, 
  Users, 
  ChefHat, 
  Truck, 
  MapPin, 
  BarChart3,
  Settings,
  ArrowLeft,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const AdminNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, signOut } = useAuth();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
    { icon: UtensilsCrossed, label: 'Items', path: '/admin/items' },
    { icon: FolderOpen, label: 'Categories', path: '/admin/categories' },
    { icon: Image, label: 'Banners', path: '/admin/banners' },
    { icon: ChefHat, label: 'Cooks', path: '/admin/cooks' },
    { icon: Truck, label: 'Delivery', path: '/admin/delivery-staff' },
    { icon: MapPin, label: 'Locations', path: '/admin/locations' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Storage', path: '/admin/storage-settings' },
  ];

  if (role === 'super_admin') {
    navItems.push({ icon: Settings, label: 'Admins', path: '/admin/admins' });
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-card">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Scrollable Nav */}
      <div className="scrollbar-hide overflow-x-auto border-t">
        <nav className="flex min-w-max gap-1 px-2 py-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-shrink-0 gap-2",
                isActive(item.path) && "bg-primary/10 text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default AdminNavbar;
