import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  // Staff auth (with password)
  signIn: (mobileNumber: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (mobileNumber: string, password: string, name: string, panchayatId: string, wardNumber: number) => Promise<{ error: Error | null }>;
  // Customer auth (passwordless)
  customerSignIn: (mobileNumber: string) => Promise<{ error: Error | null }>;
  customerSignUp: (mobileNumber: string, name: string, panchayatId: string, wardNumber: number) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData as Profile | null);

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        return;
      }

      setRole(roleData?.role as AppRole | null);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (mobileNumber: string, password: string) => {
    try {
      // Convert mobile to email format for Supabase auth
      const email = `${mobileNumber}@pennycarbs.app`;
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Check if the user has an active profile
      if (authData.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (!profileData) {
          await supabase.auth.signOut();
          return { error: new Error('This account has been deleted. Please contact support.') };
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          return { error: new Error('This account has been deactivated. Please contact support.') };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    mobileNumber: string, 
    password: string, 
    name: string, 
    panchayatId: string, 
    wardNumber: number
  ) => {
    try {
      // Convert mobile to email format for Supabase auth
      const email = `${mobileNumber}@pennycarbs.app`;
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        return { error: new Error(authError.message) };
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            name,
            mobile_number: mobileNumber,
            panchayat_id: panchayatId,
            ward_number: wardNumber,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { error: new Error('Failed to create profile. Please try again.') };
        }

        // Role is auto-assigned by database trigger
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Customer passwordless sign in - uses mobile number as identifier
  const customerSignIn = async (mobileNumber: string) => {
    try {
      // Check if customer exists in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, is_active')
        .eq('mobile_number', mobileNumber)
        .maybeSingle();

      if (profileError) {
        return { error: new Error(profileError.message) };
      }

      if (!profileData) {
        return { error: new Error('Customer not found. Please register first.') };
      }

      if (!profileData.is_active) {
        return { error: new Error('This account has been deactivated. Please contact support.') };
      }

      // Check if user has a non-customer role (staff account)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileData.user_id)
        .maybeSingle();

      if (roleData && roleData.role !== 'customer') {
        return { error: new Error('This account is registered as staff. Please use the Staff Login page.') };
      }

      // Try customer email pattern first (new passwordless format)
      const customerEmail = `${mobileNumber}@customer.pennycarbs.app`;
      const customerPassword = `PC_CUSTOMER_${mobileNumber}`;

      const { error: customerError } = await supabase.auth.signInWithPassword({
        email: customerEmail,
        password: customerPassword,
      });

      if (!customerError) {
        return { error: null };
      }

      // Try legacy staff email pattern (for customers who registered via old flow)
      const staffEmail = `${mobileNumber}@pennycarbs.app`;
      const { error: staffError } = await supabase.auth.signInWithPassword({
        email: staffEmail,
        password: customerPassword,
      });

      if (!staffError) {
        return { error: null };
      }

      // Both patterns failed - user needs to enter password manually or reset
      return { error: new Error('Unable to sign in automatically. This account may require a password. Please use Staff Login or contact support.') };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Customer passwordless sign up
  const customerSignUp = async (
    mobileNumber: string,
    name: string,
    panchayatId: string,
    wardNumber: number
  ) => {
    try {
      // Check if mobile already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, is_active, user_id')
        .eq('mobile_number', mobileNumber)
        .maybeSingle();

      if (existingProfile) {
        if (!existingProfile.is_active) {
          // Reactivate inactive/deleted profile
          const { error: reactivateError } = await supabase
            .from('profiles')
            .update({
              is_active: true,
              name,
              panchayat_id: panchayatId,
              ward_number: wardNumber,
            })
            .eq('id', existingProfile.id);

          if (reactivateError) {
            console.error('Profile reactivation error:', reactivateError);
            return { error: new Error('Failed to reactivate account. Please try again.') };
          }

          // Try to sign in with customer email pattern
          const customerEmail = `${mobileNumber}@customer.pennycarbs.app`;
          const customerPassword = `PC_CUSTOMER_${mobileNumber}`;
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: customerEmail,
            password: customerPassword,
          });

          if (!signInError) {
            return { error: null };
          }

          // Try legacy staff email pattern
          const staffEmail = `${mobileNumber}@pennycarbs.app`;
          const { error: staffSignInError } = await supabase.auth.signInWithPassword({
            email: staffEmail,
            password: customerPassword,
          });

          if (!staffSignInError) {
            return { error: null };
          }

          return { error: null };
        }
        return { error: new Error('An account with this mobile number already exists. Please login.') };
      }

      // Use mobile number as email and auto-generate password
      const email = `${mobileNumber}@customer.pennycarbs.app`;
      const password = `PC_CUSTOMER_${mobileNumber}`;
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        // If user already exists in auth but not in profiles (orphaned auth account),
        // try signing in instead
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // Try with staff email pattern
            const staffEmail = `${mobileNumber}@pennycarbs.app`;
            const { data: staffAuth, error: staffError } = await supabase.auth.signInWithPassword({
              email: staffEmail,
              password,
            });

            if (staffError) {
              return { error: new Error('An account exists with this number but could not sign in automatically. Please use Staff Login or contact support.') };
            }

            // Create profile for this existing auth user if missing
            if (staffAuth.user) {
              await supabase.from('profiles').upsert({
                user_id: staffAuth.user.id,
                name,
                mobile_number: mobileNumber,
                panchayat_id: panchayatId,
                ward_number: wardNumber,
                is_active: true,
              }, { onConflict: 'user_id' });
            }

            return { error: null };
          }

          // Sign in succeeded - ensure profile exists
          const { data: { user: signedInUser } } = await supabase.auth.getUser();
          if (signedInUser) {
            await supabase.from('profiles').upsert({
              user_id: signedInUser.id,
              name,
              mobile_number: mobileNumber,
              panchayat_id: panchayatId,
              ward_number: wardNumber,
              is_active: true,
            }, { onConflict: 'user_id' });
          }

          return { error: null };
        }
        return { error: new Error(authError.message) };
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: authData.user.id,
            name,
            mobile_number: mobileNumber,
            panchayat_id: panchayatId,
            ward_number: wardNumber,
            is_active: true,
          }, { onConflict: 'user_id' });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { error: new Error('Failed to create profile. Please try again.') };
        }

        // Role is auto-assigned by database trigger
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        customerSignIn,
        customerSignUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
