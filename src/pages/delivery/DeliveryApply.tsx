import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Truck, ArrowLeft, Phone, User, Bike, Car } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const applySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobileNumber: z.string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleNumber: z.string().optional(),
  panchayatId: z.string().min(1, 'Please select a panchayat'),
  wards: z.array(z.number()).min(1, 'Select at least one ward'),
});

type ApplyFormData = z.infer<typeof applySchema>;

const vehicleTypes = [
  { value: 'bicycle', label: 'Bicycle', icon: <Bike className="h-4 w-4" /> },
  { value: 'motorcycle', label: 'Motorcycle', icon: <Bike className="h-4 w-4" /> },
  { value: 'scooter', label: 'Scooter', icon: <Bike className="h-4 w-4" /> },
  { value: 'car', label: 'Car', icon: <Car className="h-4 w-4" /> },
];

const DeliveryApply: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { panchayats, getWardsForPanchayat } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApplyFormData>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: '',
      mobileNumber: '',
      vehicleType: '',
      vehicleNumber: '',
      panchayatId: '',
      wards: [],
    },
  });

  const selectedPanchayatId = form.watch('panchayatId');
  const selectedPanchayat = panchayats.find(p => p.id === selectedPanchayatId);
  const availableWards = selectedPanchayat ? getWardsForPanchayat(selectedPanchayat) : [];
  const selectedWards = form.watch('wards');

  const handleSubmit = async (data: ApplyFormData) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to apply",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('delivery_staff')
        .insert({
          user_id: user.id,
          name: data.name,
          mobile_number: data.mobileNumber,
          vehicle_type: data.vehicleType,
          vehicle_number: data.vehicleNumber || null,
          panchayat_id: data.panchayatId,
          assigned_wards: data.wards,
          staff_type: 'registered_partner',
          is_approved: false,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Applied",
            description: "You have already applied as a delivery partner",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Application Submitted!",
          description: "Your application is under review. We'll notify you once approved.",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWard = (ward: number) => {
    const current = form.getValues('wards');
    if (current.includes(ward)) {
      form.setValue('wards', current.filter(w => w !== ward));
    } else {
      form.setValue('wards', [...current, ward]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Become a Delivery Partner</h1>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Logo & Brand */}
        <div className="mb-6 text-center">
          <img src={logo} alt="Penny Carbs" className="mx-auto h-16 w-auto mb-2" />
          <p className="text-sm text-muted-foreground">Join our delivery team</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Delivery Partner Application</CardTitle>
            <CardDescription>Fill in your details to apply</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your name" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="10-digit mobile number" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {vehicleTypes.map((v) => (
                            <SelectItem key={v.value} value={v.value}>
                              <div className="flex items-center gap-2">
                                {v.icon}
                                {v.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., KL-07-AB-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="panchayatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Panchayat</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('wards', []);
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select panchayat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {panchayats.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPanchayat && (
                  <FormField
                    control={form.control}
                    name="wards"
                    render={() => (
                      <FormItem>
                        <FormLabel>Delivery Wards (Select multiple)</FormLabel>
                        <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                          {availableWards.map((ward) => (
                            <div
                              key={ward}
                              className={`flex items-center justify-center p-2 rounded cursor-pointer transition-colors ${
                                selectedWards.includes(ward)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                              onClick={() => toggleWard(ward)}
                            >
                              <span className="text-sm font-medium">{ward}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Selected: {selectedWards.length} ward(s)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DeliveryApply;
