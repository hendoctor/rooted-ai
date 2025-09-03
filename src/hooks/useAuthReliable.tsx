// Reliable authentication hook with centralized RBAC and session management
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthGuard, AuthCache } from '@/utils/authGuard';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { clearAllCaches } from '@/lib/cacheClient';

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
  const currentUserIdRef = useRef<string | null>(null);
  const prevRole = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch user role from database
  const fetchUserRole = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_user_role_by_auth_id', {
        auth_user_id: userId
      });

      if (error) {
        console.warn('Failed to fetch user role:', error);
        return 'Client'; // Default fallback
      }

      return (data as any)?.role || 'Client';
    } catch (error) {
      console.warn('Error fetching user role:', error);
      return 'Client';
    }
  }, []);

  // Fetch user's accessible companies
  const fetchUserCompanies = useCallback(async (role?: string): Promise<Company[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_companies');

      if (!error && data && Array.isArray(data)) {
        return (data as any[])
          .filter((company: any) => company && typeof company === 'object')
          .map((company: any) => ({
            id: company.company_id || '',
            name: company.company_name || '',
            slug: company.company_slug || '',
            userRole: company.user_role || '',
            isAdmin: company.is_admin || false
          }));
      }

      // Fallback for admin users to ensure access to all companies
      if (role === 'Admin') {
        const { data: allCompanies, error: allError } = await supabase
          .from('companies')
          .select('id, name, slug');

        if (allError) {
          console.warn('Failed to fetch all companies for admin:', allError);
          return [];
        }

        if (allCompanies && Array.isArray(allCompanies)) {
          return (allCompanies as any[])
            .filter((company: any) => company && typeof company === 'object')
            .map((company: any) => ({
              id: company.id || '',
              name: company.name || '',
              slug: company.slug || '',
              userRole: 'Admin',
              isAdmin: true
            }));
        }
      }

      if (error) {
        console.warn('Failed to fetch user companies:', error);
      }

      return [];
    } catch (error) {
      console.warn('Error fetching user companies:', error);
      return [];
    }
  }, []);

  // Check if user has required role
  const requireRole = useCallback((roles: string[], companyId?: string): boolean => {
    if (!userRole && !session) return false;

    // Determine admin status from cached role or session metadata
    const isAdmin =
      userRole === 'Admin' ||
      ((session?.user as any)?.app_metadata?.role === 'Admin') ||
      ((session?.user as any)?.user_metadata?.role === 'Admin');

    // Admin always has access to everything
    if (isAdmin) return true;

    // Check global role
    if (userRole && roles.includes(userRole)) {
      // If company-specific check needed, verify user has access to that company
      if (companyId) {
        return companies.some(c =>
          c.id === companyId && roles.includes(c.userRole)
        );
      }
      return true;
    }

    return false;
  }, [userRole, session, companies]);

  // Get accessible routes based on user's roles
  const getAccessibleRoutes = useCallback((): string[] => {
    const routes: string[] = ['/'];

    if (!user) return routes;

    // Add profile access for all authenticated users
    routes.push('/profile');

    // Add admin routes
    if (userRole === 'Admin') {
      routes.push('/admin');
    }

    // Add company portals user has access to
    companies.forEach(company => {
      routes.push(`/${company.slug}`);
    });

    return routes;
  }, [user, userRole, companies]);

  // Refresh all auth data
  const refreshAuth = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const roleResult = await fetchUserRole(user.id);
      const companiesResult = await fetchUserCompanies(roleResult);

      setUserRole(roleResult);
      setCompanies(companiesResult);
      setError(null);
    } catch (error) {
      console.error('Failed to refresh auth data:', error);
      setError('Failed to refresh authentication data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserRole, fetchUserCompanies]);

  // Simplified auth state change handler
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    try {
      if (newSession?.user) {
        const sameUser = currentUserIdRef.current === newSession.user.id;
        currentUserIdRef.current = newSession.user.id;

        // Update basic session state immediately
        setUser(newSession.user);
        setSession(newSession);
        supabase.realtime.setAuth(newSession.access_token);
        setError(null);

        // Cache session securely
        await AuthCache.setSession(newSession);

        // Ensure auth tokens keep refreshing and realtime stays connected
        supabase.auth.startAutoRefresh();
        supabase.realtime.connect();

        // Only fetch additional data when needed
        const shouldFetchData = !sameUser || ['INITIAL_SESSION', 'SIGNED_IN'].includes(event);

        if (shouldFetchData) {
          console.log('👤 Fetching user role and companies...');
          
          try {
            const roleResult = await fetchUserRole(newSession.user.id);
            const companiesResult = await fetchUserCompanies(roleResult);
            
            setUserRole(roleResult);
            setCompanies(companiesResult);
            console.log('✅ Auth data loaded successfully');
          } catch (fetchError) {
            console.warn('⚠️ Failed to fetch user data, using fallback:', fetchError);
            // Use fallback role from session metadata
            const fallbackRole = ((newSession?.user as any)?.app_metadata?.role as string) ||
                                 ((newSession?.user as any)?.user_metadata?.role as string) ||
                                 'Client';
            setUserRole(fallbackRole);
            setCompanies([]);
          }
        }
      } else {
        console.log('🚪 User signed out, clearing state...');
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanies([]);
        currentUserIdRef.current = null;
        await AuthCache.clearSession();
        supabase.auth.stopAutoRefresh();
        supabase.realtime.disconnect();
        supabase.realtime.setAuth('');
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      setError('Authentication error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchUserRole, fetchUserCompanies]);

  // Sign out with proper cleanup
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await AuthGuard.signOut();
      clearAllCaches();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out properly. You may need to refresh the page.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear caches when role changes
  useEffect(() => {
    if (prevRole.current && prevRole.current !== userRole) {
      clearAllCaches();
    }
    prevRole.current = userRole;
  }, [userRole]);

  // Simplified auth initialization
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initAuth = async () => {
      try {
        console.log('🚀 Auth initialization starting...');

        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Check for existing session
        console.log('🔍 Attempting session restoration...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🧾 Session restore result', { hasSession: !!session, error });

        if (error) {
          console.warn('Session check error:', error);
          setError('Failed to restore session');
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check for expiration and attempt refresh if needed
          if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            console.log('⏳ Session expired, attempting refresh...');
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshed.session) {
              console.warn('🔁 Session refresh failed:', refreshError);
              await AuthCache.clearSession();
              setError('Session expired. Please sign in again.');
              setLoading(false);
              return;
            }
            await handleAuthStateChange('INITIAL_SESSION', refreshed.session);
          } else {
            console.log('✅ Existing session found');
            await handleAuthStateChange('INITIAL_SESSION', session);
          }
        } else {
          console.log('❌ No existing session, user not authenticated');
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    const cleanup = initAuth();
    return () => {
      cleanup?.then(unsub => unsub?.());
    };
  }, [handleAuthStateChange]);

  // Manage session refresh and realtime connections when tab visibility changes
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        if (user) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              await supabase.auth.refreshSession();
            }
          } catch (err) {
            console.error('Visibility session refresh failed:', err);
          }
        }
        supabase.realtime.connect();
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
        supabase.realtime.disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    // run once on mount
    handleVisibility();
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  // Manage realtime and token refresh based on network connectivity
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        supabase.realtime.connect();
        supabase.auth.startAutoRefresh();
      }
    };

    const handleOffline = () => {
      supabase.auth.stopAutoRefresh();
      supabase.realtime.disconnect();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

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
    // Return a safe default context instead of throwing during initialization
    console.warn('useAuth called outside AuthProvider, returning default context');
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