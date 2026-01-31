import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Settings } from 'lucide-react';

import IndoorEventsDashboard, { type IndoorEventsStats } from './IndoorEventsDashboard';
import IndoorEventsOrders from './IndoorEventsOrders';
import IndoorEventsPlanning from './IndoorEventsPlanning';
import IndoorEventsCooks from './IndoorEventsCooks';
import IndoorEventsVehicles from './IndoorEventsVehicles';
import IndoorEventsCommissions from './IndoorEventsCommissions';
import IndoorEventsReports from './IndoorEventsReports';
import IndoorEventsAccounts from './IndoorEventsAccounts';

const IndoorEventsModule: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const isAdmin = role === 'super_admin' || role === 'admin';

  const { data: stats } = useQuery<IndoorEventsStats>({
    queryKey: ['indoor-events-stats'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount')
        .eq('service_type', 'indoor_events');

      if (error) throw error;

      const newRequests = orders?.filter((o) => o.status === 'pending').length || 0;
      const confirmed = orders?.filter((o) => o.status === 'confirmed').length || 0;
      const completed = orders?.filter((o) => o.status === 'delivered').length || 0;
      const totalRevenue =
        orders
          ?.filter((o) => o.status === 'delivered')
          .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      return { newRequests, confirmed, completed, totalRevenue, total: orders?.length || 0 };
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <Button className="mt-6" onClick={() => navigate('/admin')}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<IndoorEventsDashboard stats={stats} />} />
      <Route path="orders" element={<IndoorEventsOrders />} />
      <Route path="planning" element={<IndoorEventsPlanning />} />
      <Route path="cooks" element={<IndoorEventsCooks />} />
      <Route path="vehicles" element={<IndoorEventsVehicles />} />
      <Route path="commissions" element={<IndoorEventsCommissions />} />
      <Route path="reports" element={<IndoorEventsReports />} />
      <Route path="accounts" element={<IndoorEventsAccounts />} />
    </Routes>
  );
};

export default IndoorEventsModule;
