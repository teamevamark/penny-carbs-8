import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, ChefHat, Phone, MapPin, Loader2 } from 'lucide-react';
import type { Cook } from '@/types/cook';

const cookSchema = z.object({
  kitchenName: z.string().min(2, 'Kitchen name is required'),
  mobileNumber: z.string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  panchayatId: z.string().min(1, 'Please select a panchayat'),
  allowedOrderTypes: z.array(z.string()).min(1, 'Select at least one order type'),
});

type CookFormData = z.infer<typeof cookSchema>;

const orderTypes = [
  { value: 'indoor_events', label: 'Indoor Events' },
  { value: 'cloud_kitchen', label: 'Cloud Kitchen' },
  { value: 'homemade', label: 'Homemade Food' },
];

const AdminCooks: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { panchayats } = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cooks, isLoading } = useQuery({
    queryKey: ['admin-cooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Cook[];
    },
  });

  const form = useForm<CookFormData>({
    resolver: zodResolver(cookSchema),
    defaultValues: {
      kitchenName: '',
      mobileNumber: '',
      password: '',
      panchayatId: '',
      allowedOrderTypes: ['indoor_events', 'cloud_kitchen', 'homemade'],
    },
  });

  const handleSubmit = async (data: CookFormData) => {
    setIsSubmitting(true);
    try {
      // 1. Create auth user
      const email = `${data.mobileNumber}@pennycarbs.local`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
      });

      if (authError) throw authError;

      // 2. Create cook profile
      const { error: cookError } = await supabase
        .from('cooks')
        .insert({
          user_id: authData.user?.id,
          kitchen_name: data.kitchenName,
          mobile_number: data.mobileNumber,
          panchayat_id: data.panchayatId,
          allowed_order_types: data.allowedOrderTypes,
          created_by: user?.id,
        });

      if (cookError) throw cookError;

      // 3. Add cook role
      if (authData.user) {
        await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'cook',
          });
      }

      toast({
        title: "Cook Registered",
        description: `${data.kitchenName} has been registered successfully`,
      });

      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-cooks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register cook",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCookStatus = async (cookId: string, isActive: boolean) => {
    try {
      await supabase
        .from('cooks')
        .update({ is_active: !isActive })
        .eq('id', cookId);

      queryClient.invalidateQueries({ queryKey: ['admin-cooks'] });
      toast({
        title: "Status Updated",
        description: `Cook ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Manage Cooks</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Cook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Register New Cook
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="kitchenName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchen Name (Unique)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter kitchen name" {...field} />
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
                            <Input placeholder="10-digit mobile" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value}>
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

                  <FormField
                    control={form.control}
                    name="allowedOrderTypes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Allowed Order Types</FormLabel>
                        <div className="space-y-2">
                          {orderTypes.map((type) => (
                            <div key={type.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={type.value}
                                checked={form.watch('allowedOrderTypes').includes(type.value)}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues('allowedOrderTypes');
                                  if (checked) {
                                    form.setValue('allowedOrderTypes', [...current, type.value]);
                                  } else {
                                    form.setValue('allowedOrderTypes', current.filter(t => t !== type.value));
                                  }
                                }}
                              />
                              <label htmlFor={type.value} className="text-sm">
                                {type.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Register Cook
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : cooks && cooks.length > 0 ? (
          cooks.map((cook) => (
            <Card key={cook.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ChefHat className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cook.kitchen_name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {cook.mobile_number}
                      </p>
                      {cook.panchayat && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cook.panchayat.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={cook.is_active ? "default" : "secondary"}>
                    {cook.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-1">
                  {cook.allowed_order_types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant={cook.is_active ? "destructive" : "default"}
                    onClick={() => toggleCookStatus(cook.id, cook.is_active)}
                  >
                    {cook.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No cooks registered yet</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminCooks;
