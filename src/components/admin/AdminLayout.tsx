import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import UnacceptedOrdersAlert from './UnacceptedOrdersAlert';
import { useAdminDeliveryAlerts } from '@/hooks/useDeliveryNotifications';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'super_admin' || role === 'admin';

  const {
    unacceptedOrders,
    showAdminAlert,
    dismissAdminAlert,
    removeAdminAlert,
  } = useAdminDeliveryAlerts();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-40 h-12 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-1.5 ml-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
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
          </header>

          {/* Unaccepted Orders Alert */}
          <UnacceptedOrdersAlert
            open={showAdminAlert}
            orders={unacceptedOrders}
            onDismiss={dismissAdminAlert}
            onRemove={removeAdminAlert}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
