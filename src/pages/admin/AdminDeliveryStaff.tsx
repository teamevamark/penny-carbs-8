import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Truck, Phone, MapPin, CheckCircle, XCircle, Bike, Car } from 'lucide-react';
import type { DeliveryStaff } from '@/types/delivery';

const vehicleIcons: Record<string, React.ReactNode> = {
  bicycle: <Bike className="h-4 w-4" />,
  motorcycle: <Bike className="h-4 w-4" />,
  scooter: <Bike className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
};

const AdminDeliveryStaff: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pendingStaff, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-delivery-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryStaff[];
    },
  });

  const { data: approvedStaff, isLoading: approvedLoading } = useQuery({
    queryKey: ['admin-delivery-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryStaff[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ staffId, approve }: { staffId: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from('delivery_staff')
          .update({
            is_approved: true,
            approved_at: new Date().toISOString(),
          })
          .eq('id', staffId);
        if (error) throw error;

        // Add delivery_staff role
        const { data: staff } = await supabase
          .from('delivery_staff')
          .select('user_id')
          .eq('id', staffId)
          .single();

        if (staff?.user_id) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: staff.user_id,
              role: 'delivery_staff',
            });
        }
      } else {
        const { error } = await supabase
          .from('delivery_staff')
          .delete()
          .eq('id', staffId);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      toast({
        title: variables.approve ? "Application Approved" : "Application Rejected",
        description: variables.approve 
          ? "Delivery partner can now accept orders" 
          : "Application has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process application",
        variant: "destructive",
      });
    },
  });

  const toggleStatus = async (staffId: string, isActive: boolean) => {
    try {
      await supabase
        .from('delivery_staff')
        .update({ is_active: !isActive })
        .eq('id', staffId);

      queryClient.invalidateQueries({ queryKey: ['admin-delivery-approved'] });
      toast({
        title: "Status Updated",
        description: `Staff ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const StaffCard = ({ staff, showActions = false, isPending = false }: { 
    staff: DeliveryStaff; 
    showActions?: boolean;
    isPending?: boolean;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{staff.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {staff.mobile_number}
              </p>
              {staff.panchayat && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {staff.panchayat.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={staff.staff_type === 'fixed_salary' ? 'default' : 'secondary'}>
              {staff.staff_type === 'fixed_salary' ? 'Fixed Salary' : 'Partner'}
            </Badge>
            {!isPending && (
              <Badge variant={staff.is_active ? "outline" : "destructive"}>
                {staff.is_active ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          {vehicleIcons[staff.vehicle_type] || <Truck className="h-4 w-4" />}
          <span className="capitalize">{staff.vehicle_type}</span>
          {staff.vehicle_number && <span>• {staff.vehicle_number}</span>}
        </div>

        {staff.assigned_wards.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Wards:</span>
            {staff.assigned_wards.slice(0, 5).map((ward) => (
              <Badge key={ward} variant="outline" className="text-xs">
                {ward}
              </Badge>
            ))}
            {staff.assigned_wards.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{staff.assigned_wards.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {showActions && isPending && (
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => approveMutation.mutate({ staffId: staff.id, approve: false })}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ staffId: staff.id, approve: true })}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        )}

        {showActions && !isPending && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant={staff.is_active ? "destructive" : "default"}
              onClick={() => toggleStatus(staff.id, staff.is_active)}
            >
              {staff.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Delivery Staff</h1>
        </div>
      </header>

      <main className="container px-4 py-4">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingStaff && pendingStaff.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {pendingStaff.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : pendingStaff && pendingStaff.length > 0 ? (
              pendingStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} showActions isPending />
              ))
            ) : (
              <Card className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">No pending applications</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approvedLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : approvedStaff && approvedStaff.length > 0 ? (
              approvedStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} showActions />
              ))
            ) : (
              <Card className="p-6 text-center">
                <Truck className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No approved delivery staff</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDeliveryStaff;
