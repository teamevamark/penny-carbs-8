import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Car, Plus, Phone, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VehicleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  onSuccess: () => void;
}

interface ExistingVehicle {
  id: string;
  vehicle_number: string;
  driver_name: string | null;
  driver_mobile: string;
}

const VehicleSelectionDialog: React.FC<VehicleSelectionDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // New vehicle form
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');

  // Get recently used vehicles (unique by vehicle_number, last used first)
  const { data: recentVehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['recent-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indoor_event_vehicles')
        .select('id, vehicle_number, driver_name, driver_mobile, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get unique vehicles by vehicle_number (keep most recent)
      const uniqueVehicles = new Map<string, ExistingVehicle>();
      data?.forEach((v) => {
        if (!uniqueVehicles.has(v.vehicle_number)) {
          uniqueVehicles.set(v.vehicle_number, {
            id: v.id,
            vehicle_number: v.vehicle_number,
            driver_name: v.driver_name,
            driver_mobile: v.driver_mobile,
          });
        }
      });

      return Array.from(uniqueVehicles.values());
    },
    enabled: open,
  });

  const resetForm = () => {
    setSelectedVehicleId('');
    setVehicleNumber('');
    setDriverName('');
    setDriverMobile('');
    setActiveTab('existing');
  };

  // Add vehicle and update order status
  const submitMutation = useMutation({
    mutationFn: async () => {
      let vehicleData: { vehicle_number: string; driver_name: string | null; driver_mobile: string };

      if (activeTab === 'existing' && selectedVehicleId) {
        // Use existing vehicle data
        const existingVehicle = recentVehicles?.find(v => v.id === selectedVehicleId);
        if (!existingVehicle) throw new Error('Selected vehicle not found');
        vehicleData = {
          vehicle_number: existingVehicle.vehicle_number,
          driver_name: existingVehicle.driver_name,
          driver_mobile: existingVehicle.driver_mobile,
        };
      } else if (activeTab === 'new') {
        // Use new vehicle form data
        if (!vehicleNumber || !driverMobile) {
          throw new Error('Vehicle number and driver mobile are required');
        }
        vehicleData = {
          vehicle_number: vehicleNumber,
          driver_name: driverName || null,
          driver_mobile: driverMobile,
        };
      } else {
        throw new Error('Please select or add a vehicle');
      }

      // Insert vehicle record for this order
      const { error: vehicleError } = await supabase
        .from('indoor_event_vehicles')
        .insert({
          order_id: orderId,
          vehicle_number: vehicleData.vehicle_number,
          driver_name: vehicleData.driver_name,
          driver_mobile: vehicleData.driver_mobile,
        });

      if (vehicleError) throw vehicleError;

      // Update order status to out_for_delivery
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indoor-event-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['recent-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['indoor-events-orders'] });
      toast({
        title: 'Order Shipped',
        description: 'Vehicle assigned and order marked as out for delivery',
      });
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (activeTab === 'existing' && !selectedVehicleId) {
      toast({
        title: 'Select a vehicle',
        description: 'Please select a vehicle or add a new one',
        variant: 'destructive',
      });
      return;
    }
    if (activeTab === 'new' && (!vehicleNumber || !driverMobile)) {
      toast({
        title: 'Fill required fields',
        description: 'Vehicle number and driver mobile are required',
        variant: 'destructive',
      });
      return;
    }
    submitMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Assign Vehicle
          </DialogTitle>
          <DialogDescription>
            Order #{orderNumber} - Add vehicle details for shipping
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Select Existing</TabsTrigger>
            <TabsTrigger value="new">
              <Plus className="h-4 w-4 mr-1" />
              Add New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
            {vehiclesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !recentVehicles?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No vehicles found</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setActiveTab('new')}
                >
                  Add new vehicle
                </Button>
              </div>
            ) : (
              <RadioGroup
                value={selectedVehicleId}
                onValueChange={setSelectedVehicleId}
                className="space-y-2 max-h-60 overflow-y-auto"
              >
                {recentVehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer transition-colors ${
                      selectedVehicleId === vehicle.id
                        ? 'border-indoor-events bg-indoor-events/5'
                        : 'hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-medium text-sm">
                            {vehicle.vehicle_number}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {vehicle.driver_name || 'Unknown driver'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vehicle.driver_mobile}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-number">Vehicle Number *</Label>
              <Input
                id="vehicle-number"
                placeholder="KL-XX-XXXX"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver Name</Label>
              <Input
                id="driver-name"
                placeholder="Driver name (optional)"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-mobile">Driver Mobile *</Label>
              <Input
                id="driver-mobile"
                placeholder="Phone number"
                value={driverMobile}
                onChange={(e) => setDriverMobile(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Car className="h-4 w-4 mr-1" />
            Ship Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleSelectionDialog;
