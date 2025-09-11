// Mobile-optimized authentication hook - best practices implementation
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface Company {
  id: string;
  name: string;
  slug: string;
  userRole: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  companies: Company[];
  loading: boolean;
  error: string | null;
  
  // Actions
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const performance = usePerformanceMonitor();

  // Fetch user profile data with timeout and retry
  const fetchUserProfile = useCallback(async (userId: string): Promise<{ role: string; companies: Company[] }> => {
    if (!userId) {
      console.warn('No userId provided to fetchUserProfile');
      return { role: 'Client', companies: [] };
    }

    console.log('👤 Fetching user profile for:', userId);

    return new Promise((resolve, reject) => {
      // 5-second timeout for profile fetch
      const profileTimeout = setTimeout(() => {
        console.warn('⚠️ Profile fetch timeout - using defaults');
        resolve({ role: 'Client', companies: [] });
      }, 5000);

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_profile', {
            p_user_id: userId
          });

          clearTimeout(profileTimeout);

          if (error) {
            console.error('Error fetching user profile:', error);
            throw error;
          }

          if (!data || data.length === 0) {
            console.warn('No user profile data returned');
            resolve({ role: 'Client', companies: [] });
            return;
          }

          const profileData = data[0];
          const role = profileData.user_role || 'Client';
          
          // Parse companies from jsonb
          let companiesData: Company[] = [];
          if (profileData.companies && Array.isArray(profileData.companies)) {
            companiesData = profileData.companies.map((company: any) => ({
              id: company.id,
              name: company.name,
              slug: company.slug,
              userRole: company.userRole,
              isAdmin: company.isAdmin
            }));
          }

          console.log('✅ User profile loaded successfully:', { role, companiesCount: companiesData.length });
          resolve({ role, companies: companiesData });
        } catch (error) {
          clearTimeout(profileTimeout);
          console.error('Failed to fetch user profile:', error);
          reject(error);
        }
      };

      fetchProfile();
    });
  }, []);

  // Handle auth state changes - SYNCHRONOUS to prevent deadlocks
  const handleAuthStateChange = useCallback((event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    if (newSession?.user) {
      // Set basic auth state immediately and synchronously
      setUser(newSession.user);
      setSession(newSession);
      setError(null);
      setLoading(false); // Clear loading immediately for responsive UI
      
      // Defer profile fetching to prevent auth listener deadlock
      setTimeout(() => {
        performance.trackProfileFetch();
        fetchUserProfile(newSession.user.id)
          .then(({ role, companies: companiesData }) => {
            performance.trackProfileComplete();
            setUserRole(role);
            setCompanies(companiesData);
            console.log('✅ User profile loaded successfully');
          })
          .catch((error) => {
            performance.trackProfileComplete();
            console.error('Error loading user profile:', error);
            // CRITICAL: Only set default role if no existing role (first login)
            // For refresh scenarios, preserve existing role to prevent admin -> client regression
            setUserRole(prevRole => {
              if (prevRole && prevRole !== 'Client') {
                console.warn('⚠️ Profile fetch failed - preserving existing role:', prevRole);
                return prevRole;
              }
              return 'Client';
            });
            setCompanies(prevCompanies => prevCompanies || []);
            setError('Profile data unavailable, using existing data');
          });
      }, 0);
    } else {
      // User signed out - synchronous cleanup
      console.log('🚪 User signed out');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setError(null);
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Refresh auth data - preserve existing role on failure
  const refreshAuth = useCallback(async () => {
    if (!user?.id) {
      console.warn('No user ID available for refresh');
      return;
    }

    console.log('🔄 Refreshing auth data...');
    setError(null);

    try {
      const { role, companies: companiesData } = await fetchUserProfile(user.id);
      setUserRole(role);
      setCompanies(companiesData);
      console.log('✅ Auth data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      // CRITICAL: Don't reset role on refresh failure - preserve existing state
      console.warn('⚠️ Preserving existing auth state due to refresh failure');
      setError('Failed to refresh authentication data');
    }
  }, [user?.id, fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);
      await supabase.auth.signOut();
      // State will be cleared by handleAuthStateChange
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out properly. Refreshing page.",
        variant: "destructive",
      });
      window.location.reload();
    }
  }, [toast]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Initialize auth with timeout protection
  useEffect(() => {
    console.log('🚀 Initializing auth...');
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        performance.trackAuthInit();
        
        // Set 10-second timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth initialization timeout - clearing loading state');
            setLoading(false);
            setError('Authentication took too long - please refresh');
          }
        }, 10000);

        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return () => subscription.unsubscribe();
        
        // Clear timeout since we got a response
        clearTimeout(authTimeout);
        
        if (error) {
          console.warn('Session error:', error);
          setError('Failed to restore session');
          setLoading(false);
          return () => subscription.unsubscribe();
        }

        if (session?.user) {
          console.log('✅ Found existing session');
          performance.trackAuthComplete();
          handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          console.log('❌ No existing session');
          performance.trackAuthComplete();
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        if (mounted) {
          console.error('Auth init failed:', error);
          setError('Failed to initialize authentication');
          setLoading(false);
        }
        return () => {};
      }
    };

    const cleanup = initAuth();
    
    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      cleanup?.then(unsub => unsub?.());
    };
  }, [handleAuthStateChange]);

  const value: AuthContextType = {
    user,
    session,
    userRole,
    companies,
    loading,
    error,
    signOut,
    refreshAuth,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('useAuth called outside AuthProvider');
    return {
      user: null,
      session: null,
      userRole: null,
      companies: [],
      loading: true,
      error: null,
      signOut: async () => {},
      refreshAuth: async () => {},
      clearError: () => {}
    };
  }
  return context;
};