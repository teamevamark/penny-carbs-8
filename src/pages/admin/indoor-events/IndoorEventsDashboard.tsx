import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  FileText,
  ChefHat,
  Car,
  BarChart3,
  Percent,
  Wallet,
} from 'lucide-react';

export type IndoorEventsStats = {
  newRequests: number;
  confirmed: number;
  completed: number;
  totalRevenue: number;
  total: number;
};

type Props = {
  stats?: IndoorEventsStats;
};

const IndoorEventsDashboard: React.FC<Props> = ({ stats }) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      icon: ClipboardList,
      label: 'All Event Bookings',
      path: '/admin/indoor-events/orders',
      description: 'View & manage all event orders',
      badge: stats?.total,
    },
    {
      icon: FileText,
      label: 'Planning Requests',
      path: '/admin/indoor-events/planning',
      description: 'New requests awaiting planning',
      badge: stats?.newRequests,
      badgeVariant: 'destructive' as const,
    },
    {
      icon: ChefHat,
      label: 'Cook Assignment',
      path: '/admin/indoor-events/cooks',
      description: 'Assign cooks by panchayat',
    },
    {
      icon: Car,
      label: 'Rental Vehicles',
      path: '/admin/indoor-events/vehicles',
      description: 'Manage vehicle details for events',
    },
    {
      icon: Percent,
      label: 'Commission Tracking',
      path: '/admin/indoor-events/commissions',
      description: 'Agent & referral commissions',
    },
    {
      icon: Wallet,
      label: 'Accounts & Payouts',
      path: '/admin/indoor-events/accounts',
      description: 'Cook settlements & payouts',
    },
    {
      icon: BarChart3,
      label: 'Event Reports',
      path: '/admin/indoor-events/reports',
      description: 'Panchayat & ward-wise sales',
    },
  ];

  const statusFlow = [
    { label: 'New Request', color: 'bg-yellow-500' },
    { label: 'Planning Submitted', color: 'bg-blue-500' },
    { label: 'Admin Reviewed', color: 'bg-purple-500' },
    { label: 'Quotation Sent', color: 'bg-indigo-500' },
    { label: 'Advance Paid', color: 'bg-orange-500' },
    { label: 'Confirmed', color: 'bg-green-500' },
    { label: 'Completed', color: 'bg-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-indoor-events text-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="text-white hover:bg-white/20"
            >
              {/* keep icon inline to avoid extra imports */}
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
            </Button>
            <span className="text-lg font-semibold">Indoor Events</span>
          </div>
        </div>
      </header>

      <main className="p-4 pb-20">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats?.newRequests || 0}</p>
              <p className="text-xs text-muted-foreground">New Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats?.confirmed || 0}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats?.completed || 0}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                ₹{stats?.totalRevenue?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Event Status Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusFlow.map((status, index) => (
                <div key={status.label} className="flex items-center gap-1">
                  <span className={`h-3 w-3 rounded-full ${status.color}`} />
                  <span className="text-xs">{status.label}</span>
                  {index < statusFlow.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer transition-all hover:shadow-md hover:border-indoor-events/50"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-indoor-events/10 p-3 text-indoor-events">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.label}</h4>
                    {item.badge !== undefined && (item.badge ?? 0) > 0 && (
                      <Badge variant={item.badgeVariant || 'secondary'} className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
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

export default IndoorEventsDashboard;
