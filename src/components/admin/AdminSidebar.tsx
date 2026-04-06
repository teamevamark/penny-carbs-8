import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
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
  LogOut,
  FolderOpen,
  CalendarHeart,
  Home,
  Tag,
  ClipboardList,
  HardDrive,
  Shield,
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const moduleItems = [
    { title: 'Indoor Events', url: '/admin/indoor-events', icon: CalendarHeart },
    { title: 'Cloud Kitchen', url: '/admin/cloud-kitchen', icon: ChefHat },
    { title: 'Home Delivery', url: '/admin/home-delivery', icon: Home },
  ];

  const managementItems = [
    { title: 'All Orders', url: '/admin/orders', icon: ShoppingBag },
    { title: 'Food Items', url: '/admin/items', icon: UtensilsCrossed },
    { title: 'Categories', url: '/admin/categories', icon: FolderOpen },
    { title: 'Cooks', url: '/admin/cooks', icon: ChefHat },
    { title: 'Delivery Staff', url: '/admin/delivery-staff', icon: Truck },
    { title: 'Work Assignment', url: '/admin/work-assignment', icon: ClipboardList },
    { title: 'Users', url: '/admin/users', icon: Users },
  ];

  const settingsItems = [
    { title: 'Locations', url: '/admin/locations', icon: MapPin },
    { title: 'Banners', url: '/admin/banners', icon: Image },
    { title: 'Special Offers', url: '/admin/special-offers', icon: Tag },
    { title: 'Reports', url: '/admin/reports', icon: BarChart3 },
    { title: 'Storage', url: '/admin/storage-settings', icon: HardDrive },
  ];

  const superAdminItems = role === 'super_admin' ? [
    { title: 'Admin Management', url: '/admin/admins', icon: Shield },
  ] : [];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const renderMenuItems = (items: typeof moduleItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          tooltip={item.title}
        >
          <NavLink
            to={item.url}
            end={item.url === '/admin'}
            className="hover:bg-sidebar-accent/50"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin Panel</span>
              <span className="text-xs text-muted-foreground truncate">
                {profile?.name || 'Admin'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/admin') && location.pathname === '/admin'}
                  tooltip="Dashboard"
                >
                  <NavLink
                    to="/admin"
                    end
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operational Modules */}
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(moduleItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(managementItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings & Reports */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings & Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(settingsItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super Admin */}
        {superAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderMenuItems(superAdminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={handleLogout}
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
