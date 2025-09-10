// Simplified and reliable authentication hook
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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
  requireRole: (roles: string[], companyId?: string) => boolean;
  getAccessibleRoutes: () => string[];
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch user profile data using the new simplified function
  const fetchUserProfile = useCallback(async (userId: string, abortSignal?: AbortSignal) => {
    if (!userId) {
      console.warn('No userId provided to fetchUserProfile');
      return { role: 'Client', companies: [] };
    }

    if (isRefreshing) {
      console.warn('Profile fetch already in progress, skipping');
      return { role: userRole || 'Client', companies };
    }

    console.log('👤 Fetching user profile for:', userId);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_user_profile', {
        p_user_id: userId
      });

      if (abortSignal?.aborted) {
        console.log('Profile fetch aborted');
        return { role: 'Client', companies: [] };
      }

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No user profile data returned');
        return { role: 'Client', companies: [] };
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
      return { role, companies: companiesData };
    } catch (error) {
      if (abortSignal?.aborted) {
        console.log('Profile fetch aborted');
        return { role: 'Client', companies: [] };
      }
      console.error('Failed to fetch user profile:', error);
      setError('Failed to load user profile');
      return { role: 'Client', companies: [] };
    }
  }, [isRefreshing, userRole, companies]);

  // Handle auth state changes with debouncing
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    if (newSession?.user) {
      // Set basic auth state immediately
      setUser(newSession.user);
      setSession(newSession);
      setError(null);
      setIsRefreshing(true);

      // Fetch user profile data
      try {
        const { role, companies: companiesData } = await fetchUserProfile(newSession.user.id);
        setUserRole(role);
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error loading user profile during auth change:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    } else {
      // User signed out
      console.log('🚪 User signed out');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setError(null);
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchUserProfile]);

  // Check if user has required role
  const requireRole = useCallback((roles: string[], companyId?: string): boolean => {
    if (!userRole || !session) return false;

    // Admin always has access
    if (userRole === 'Admin') return true;

    // Check global role
    if (roles.includes(userRole)) {
      // If company-specific check needed, verify access
      if (companyId) {
        return companies.some(c => c.id === companyId && roles.includes(c.userRole));
      }
      return true;
    }

    return false;
  }, [userRole, session, companies]);

  // Get accessible routes
  const getAccessibleRoutes = useCallback((): string[] => {
    const routes: string[] = ['/'];
    if (!user) return routes;

    routes.push('/profile');
    if (userRole === 'Admin') routes.push('/admin');
    companies.forEach(company => routes.push(`/${company.slug}`));

    return routes;
  }, [user, userRole, companies]);

  // Refresh auth data with debouncing
  const refreshAuth = useCallback(async () => {
    if (!user?.id || isRefreshing) {
      console.warn('No user ID available for refresh or already refreshing');
      return;
    }

    console.log('🔄 Refreshing auth data...');
    setIsRefreshing(true);
    setError(null);

    try {
      const { role, companies: companiesData } = await fetchUserProfile(user.id);
      setUserRole(role);
      setCompanies(companiesData);
      console.log('✅ Auth data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setError('Failed to refresh authentication');
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing, fetchUserProfile]);

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

  // Initialize auth
  useEffect(() => {
    console.log('🚀 Initializing auth...');

    const initAuth = async () => {
      try {
        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session error:', error);
          setError('Failed to restore session');
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Found existing session');
          await handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          console.log('❌ No existing session');
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth init failed:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    const cleanup = initAuth();
    return () => {
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
    requireRole,
    getAccessibleRoutes,
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
      requireRole: () => false,
      getAccessibleRoutes: () => ['/'],
      clearError: () => {}
    };
  }
  return context;
};