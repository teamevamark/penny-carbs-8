import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Phone, User, Shield, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';

const loginSchema = z.object({
  mobileNumber: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  mobileNumber: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  panchayatId: z.string().min(1, 'Please select a panchayat'),
  wardNumber: z.string().min(1, 'Please select a ward'),
});

const staffQuickAccessSchema = z.object({
  mobileNumber: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type StaffQuickAccessData = z.infer<typeof staffQuickAccessSchema>;

interface CustomerLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

const CustomerLoginDialog: React.FC<CustomerLoginDialogProps> = ({
  open,
  onOpenChange,
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const { customerSignIn, customerSignUp } = useAuth();
  const { panchayats, getWardsForPanchayat, isLoading: locationLoading } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobileNumber: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', mobileNumber: '', panchayatId: '', wardNumber: '' },
  });

  const staffForm = useForm<StaffQuickAccessData>({
    resolver: zodResolver(staffQuickAccessSchema),
    defaultValues: { mobileNumber: '' },
  });

  const selectedPanchayatId = signupForm.watch('panchayatId');
  const selectedPanchayat = panchayats.find((p) => p.id === selectedPanchayatId);
  const availableWards = selectedPanchayat ? getWardsForPanchayat(selectedPanchayat) : [];

  useEffect(() => {
    signupForm.setValue('wardNumber', '');
  }, [selectedPanchayatId, signupForm]);

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      // Check if this customer's panchayat is active before login
      const { data: profileData } = await supabase
        .from('profiles')
        .select('panchayat_id')
        .eq('mobile_number', data.mobileNumber)
        .maybeSingle();

      if (profileData?.panchayat_id) {
        // If the panchayat is not in our active list, it's inactive
        const isActive = panchayats.some(p => p.id === profileData.panchayat_id);
        if (!isActive) {
          setShowInactivePanchayat(true);
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await customerSignIn(data.mobileNumber);
      if (error) {
        if (error.message.includes('not found')) {
          toast({
            title: 'Account not found',
            description: 'Please register first to continue',
            variant: 'destructive',
          });
          setActiveTab('signup');
          signupForm.setValue('mobileNumber', data.mobileNumber);
        } else {
          toast({
            title: 'Login failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({ title: 'Welcome back!', description: 'You have been logged in successfully' });
        onOpenChange(false);
        onLoginSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showInactivePanchayat, setShowInactivePanchayat] = useState(false);

  const handleSignup = async (data: SignupFormData) => {
    // Check if selected panchayat is active
    const selected = panchayats.find(p => p.id === data.panchayatId);
    if (selected && !selected.is_active) {
      setShowInactivePanchayat(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await customerSignUp(
        data.mobileNumber,
        data.name,
        data.panchayatId,
        parseInt(data.wardNumber, 10)
      );
      if (error) {
        toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Welcome!', description: 'Your account has been created successfully' });
        onOpenChange(false);
        onLoginSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffQuickAccess = async (data: StaffQuickAccessData) => {
    setIsSubmitting(true);
    try {
      // Check if this mobile number belongs to a staff member (cook or delivery_staff or admin)
      const { data: cookData } = await supabase
        .from('cooks')
        .select('id, user_id, mobile_number')
        .eq('mobile_number', data.mobileNumber)
        .eq('is_active', true)
        .maybeSingle();

      const { data: deliveryData } = await supabase
        .from('delivery_staff')
        .select('id, user_id, mobile_number')
        .eq('mobile_number', data.mobileNumber)
        .eq('is_active', true)
        .maybeSingle();

      // Check if user has admin/super_admin role through profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('mobile_number', data.mobileNumber)
        .maybeSingle();

      let isStaff = false;
      if (cookData || deliveryData) {
        isStaff = true;
      } else if (profileData) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profileData.user_id)
          .maybeSingle();

        if (roleData && (roleData.role === 'admin' || roleData.role === 'super_admin')) {
          isStaff = true;
        }
      }

      if (!isStaff) {
        toast({
          title: 'Not a staff member',
          description: 'This mobile number is not registered as staff. Please use customer login.',
          variant: 'destructive',
        });
        setActiveTab('login');
        loginForm.setValue('mobileNumber', data.mobileNumber);
        return;
      }

      // Staff member found - log them in as customer
      const { error } = await customerSignIn(data.mobileNumber);
      if (error) {
        // If they don't have a customer account, try signing them up silently
        if (error.message.includes('not found')) {
          toast({
            title: 'Staff Quick Access',
            description: 'You can now browse as a customer. Note: You cannot access dashboards in this mode.',
          });
          // Set a session flag for staff browsing mode
          sessionStorage.setItem('staff_browse_mode', 'true');
          sessionStorage.setItem('staff_mobile', data.mobileNumber);
          onOpenChange(false);
          onLoginSuccess?.();
        } else {
          toast({ title: 'Access failed', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({
          title: 'Staff Quick Access',
          description: 'You are now browsing as a customer. Use staff login for dashboard access.',
        });
        sessionStorage.setItem('staff_browse_mode', 'true');
        onOpenChange(false);
        onLoginSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src={logo} alt="Penny Carbs" className="h-12 w-auto" />
          </div>
          <DialogTitle>Login Required</DialogTitle>
          <DialogDescription>Please login to view dish details and place orders</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login" className="text-xs">Customer</TabsTrigger>
            <TabsTrigger value="signup" className="text-xs">New User</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          </TabsList>

          {/* Customer Login Tab */}
          <TabsContent value="login" className="mt-4">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter 10-digit mobile number" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup" className="mt-4">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
                <FormField
                  control={signupForm.control}
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
                  control={signupForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter 10-digit mobile number" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={signupForm.control}
                    name="panchayatId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Panchayat</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover">
                            {panchayats.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="wardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ward</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPanchayatId}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover max-h-48">
                            {availableWards.map((wardNum) => (
                              <SelectItem key={wardNum} value={wardNum.toString()}>Ward {wardNum}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || locationLoading}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Staff Quick Access Tab */}
          <TabsContent value="staff" className="mt-4">
            <div className="mb-4 rounded-lg border border-muted bg-muted/30 p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Staff can browse as customers without credentials. Dashboard access requires full login via{' '}
                  <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate('/auth')}>
                    Staff Login
                  </Button>
                </p>
              </div>
            </div>
            <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(handleStaffQuickAccess)} className="space-y-4">
                <FormField
                  control={staffForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Mobile Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter registered staff mobile" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Quick Access
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Inactive Panchayat Popup */}
    <AlertDialog open={showInactivePanchayat} onOpenChange={setShowInactivePanchayat}>
      <AlertDialogContent className="max-w-sm text-center border-none bg-gradient-to-b from-primary to-primary/90 text-primary-foreground p-8 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Penny Carbs" className="h-16 w-auto" />
          <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold">Your Panchayath Not Started!</h2>
          <p className="text-primary-foreground/80 text-sm">
            We Will Be Coming Soon to your area. Stay tuned!
          </p>
          <Button
            variant="secondary"
            className="w-full mt-2"
            onClick={() => setShowInactivePanchayat(false)}
          >
            OK, Got It
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default CustomerLoginDialog;
