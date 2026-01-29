import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ChefHat, Store, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const loginSchema = z.object({
  kitchenName: z.string().min(2, 'Kitchen name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const CookLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      kitchenName: '',
      password: '',
    },
  });

  // Check if already logged in as cook
  useEffect(() => {
    const checkCookStatus = async () => {
      if (user && !authLoading) {
        const { data: cook } = await supabase
          .from('cooks')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cook) {
          navigate('/cook/dashboard');
        }
      }
    };

    checkCookStatus();
  }, [user, authLoading, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      // First, find the cook by kitchen name
      const { data: cook, error: cookError } = await supabase
        .from('cooks')
        .select('mobile_number')
        .eq('kitchen_name', data.kitchenName)
        .eq('is_active', true)
        .maybeSingle();

      if (cookError || !cook) {
        toast({
          title: "Login failed",
          description: "Kitchen not found or inactive",
          variant: "destructive",
        });
        return;
      }

      // Login using the mobile number as email (Supabase auth pattern)
      const email = `${cook.mobile_number}@pennycarbs.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: "Invalid password",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome!",
          description: "You have been logged in successfully",
        });
        navigate('/cook/dashboard');
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
        <p className="text-sm text-muted-foreground">Cook / Food Partner Login</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Kitchen Login</CardTitle>
          <CardDescription>Sign in with your kitchen name and password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="kitchenName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kitchen Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your kitchen name"
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
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Enter password"
                          className="pl-10"
                          {...field}
                        />
                      </div>
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
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        Contact admin if you don't have login credentials
      </p>
    </div>
  );
};

export default CookLogin;
