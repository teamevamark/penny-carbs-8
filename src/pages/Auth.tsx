import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Phone, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const loginSchema = z.object({
  mobileNumber: z.string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  mobileNumber: z.string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain only digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  panchayatId: z.string().min(1, 'Please select a panchayat'),
  wardNumber: z.string().min(1, 'Please select a ward'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, role, isLoading: authLoading } = useAuth();
  const { panchayats, getWardsForPanchayat, isLoading: locationLoading } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [selectedPanchayatForWards, setSelectedPanchayatForWards] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobileNumber: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      mobileNumber: '',
      password: '',
      confirmPassword: '',
      panchayatId: '',
      wardNumber: '',
    },
  });

  const selectedPanchayatId = signupForm.watch('panchayatId');
  
  // Get the selected panchayat object and generate ward numbers
  const selectedPanchayat = panchayats.find(p => p.id === selectedPanchayatId);
  const availableWards = selectedPanchayat ? getWardsForPanchayat(selectedPanchayat) : [];

  // Reset ward when panchayat changes
  useEffect(() => {
    signupForm.setValue('wardNumber', '');
  }, [selectedPanchayatId]);

  // Redirect based on role after login
  useEffect(() => {
    if (user && !authLoading) {
      // Check if user is cook or delivery staff and redirect accordingly
      checkStaffStatusAndRedirect(user.id);
    }
  }, [user, authLoading]);

  const checkStaffStatusAndRedirect = async (userId: string) => {
    try {
      // Check if user is a cook
      const { data: cook } = await supabase
        .from('cooks')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (cook) {
        navigate('/cook/dashboard');
        return;
      }

      // Check if user is delivery staff
      const { data: delivery } = await supabase
        .from('delivery_staff')
        .select('id, is_active, is_approved')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (delivery) {
        navigate('/delivery/dashboard');
        return;
      }

      // Default redirect for admin/super_admin or regular users
      if (role === 'super_admin' || role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking staff status:', error);
      navigate('/');
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(data.mobileNumber, data.password);
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully",
        });
        // Redirect will be handled by useEffect
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await signUp(
        data.mobileNumber,
        data.password,
        data.name,
        data.panchayatId,
        parseInt(data.wardNumber, 10)
      );
      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "You can now log in with your mobile number",
        });
        setActiveTab('login');
        loginForm.setValue('mobileNumber', data.mobileNumber);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
      {/* Logo & Brand */}
      <div className="mb-8 text-center">
        <img src={logo} alt="Penny Carbs" className="mx-auto h-20 w-auto mb-2" />
        <p className="text-sm text-muted-foreground">Staff Portal</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Staff Login</CardTitle>
          <CardDescription>Sign in to access staff portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
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
                            <Input
                              placeholder="Enter 10-digit mobile number"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
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
                            <Input
                              placeholder="Enter 10-digit mobile number"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                      control={signupForm.control}
                      name="wardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ward</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!selectedPanchayatId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover max-h-60">
                              {availableWards.map((wardNum) => (
                                <SelectItem key={wardNum} value={wardNum.toString()}>
                                  Ward {wardNum}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting || locationLoading}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Customer?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/customer-auth')}>
            Order food here
          </Button>
        </p>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        By continuing, you agree to our Terms of Service
      </p>
    </div>
  );
};

export default Auth;
