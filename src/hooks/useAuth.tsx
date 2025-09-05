// Simplified and modernized authentication hook
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CacheManager } from '@/lib/cacheManager';

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
  const initializingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch user role and companies in one optimized call
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      console.log('👤 Fetching user data for:', userId);
      
      // Use optimized function that gets everything in one call
      const { data, error } = await supabase.rpc('get_user_context_optimized', {
        user_id: userId
      });

      if (error) {
        console.warn('Failed to fetch user context:', error);
        // Fallback to individual calls
        const roleResult = await fetchUserRole(userId);
        const companiesResult = await fetchUserCompanies(roleResult);
        return { role: roleResult, companies: companiesResult };
      }

      if (data && data.length > 0) {
        const userData = data[0];
        const role = userData.role || 'Client';
        const companiesRaw = userData.companies || [];
        const companiesData = Array.isArray(companiesRaw) ? companiesRaw.map((company: any) => ({
          id: company.company_id,
          name: company.company_name,
          slug: company.company_slug,
          userRole: company.user_role,
          isAdmin: company.is_admin
        })) : [];
        
        return { role, companies: companiesData };
      }

      return { role: 'Client', companies: [] };
    } catch (error) {
      console.warn('Error fetching user data:', error);
      return { role: 'Client', companies: [] };
    }
  }, []);

  // Fallback individual fetch functions
  const fetchUserRole = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_user_role_by_auth_id', {
        auth_user_id: userId
      });
      if (error) throw error;
      return (data as any)?.role || 'Client';
    } catch (error) {
      console.warn('Error fetching user role:', error);
      return 'Client';
    }
  }, []);

  const fetchUserCompanies = useCallback(async (role?: string): Promise<Company[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_companies');
      if (error) throw error;

      if (data && Array.isArray(data)) {
        return data.map((company: any) => ({
          id: company.company_id,
          name: company.company_name,
          slug: company.company_slug,
          userRole: company.user_role,
          isAdmin: company.is_admin
        }));
      }

      return [];
    } catch (error) {
      console.warn('Error fetching user companies:', error);
      return [];
    }
  }, []);

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

  // Refresh auth data
  const refreshAuth = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { role, companies: companiesData } = await fetchUserData(user.id);
      setUserRole(role);
      setCompanies(companiesData);
      setError(null);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setError('Failed to refresh authentication');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserData]);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    try {
      if (newSession?.user) {
        const userId = newSession.user.id;
        const isNewUser = prevUserIdRef.current !== userId;
        prevUserIdRef.current = userId;

        // Clear caches if user changed
        if (isNewUser) {
          console.log('👤 New user detected, clearing caches');
          CacheManager.clearUserData();
        }

        // Set basic auth state immediately
        setUser(newSession.user);
        setSession(newSession);
        setError(null);

        // Only fetch user data if it's a new user or initial session
        if (isNewUser || event === 'SIGNED_IN') {
          const { role, companies: companiesData } = await fetchUserData(userId);
          setUserRole(role);
          setCompanies(companiesData);
        }
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanies([]);
        prevUserIdRef.current = null;
        CacheManager.clearAll();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      setError('Authentication error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchUserData]);

  // Sign out with cleanup
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      CacheManager.clearAll();
      await supabase.auth.signOut();
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
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');

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