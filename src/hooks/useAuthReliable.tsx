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
        return (data as any[]).map((company) => ({
          id: company.company_id,
          name: company.company_name,
          slug: company.company_slug,
          userRole: company.user_role,
          isAdmin: company.is_admin
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
          return allCompanies.map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
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
      routes.push(`/company/${company.slug}`);
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

  // Handle auth state changes with timeout protection
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    try {
      if (newSession?.user) {
        const sameUser = currentUserIdRef.current === newSession.user.id;
        currentUserIdRef.current = newSession.user.id;

        // Update basic session state
        setUser(newSession.user);
        setSession(newSession);

        // Cache session
        AuthCache.setSession(newSession);

        const shouldFetchData = !sameUser || ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event);

        if (shouldFetchData) {
          console.log('👤 User signed in, fetching additional data...');

          const dataPromise = (async () => {
            const roleResult = await fetchUserRole(newSession.user.id);
            const companiesResult = await fetchUserCompanies(roleResult);
            return [roleResult, companiesResult] as [string | null, Company[]];
          })();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('User data fetch timeout')), 15000)
          );

          try {
            const [roleResult, companiesResult] = await Promise.race([
              dataPromise,
              timeoutPromise
            ]) as [string | null, Company[]];

            setUserRole(roleResult);
            setCompanies(companiesResult);
            setError(null);
            console.log('✅ Auth state fully loaded');
          } catch (fetchError) {
            console.warn('⚠️ User data fetch failed, retaining existing data:', fetchError);
            // Preserve existing role/companies; attempt to derive role from session
            setUserRole(prev => prev ?? (
              ((newSession?.user as any)?.app_metadata?.role as string) ||
              ((newSession?.user as any)?.user_metadata?.role as string) ||
              'Client'
            ));
            setError(null);
          }
        }
      } else {
        console.log('🚪 User signed out, clearing state...');
        // User signed out
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanies([]);
        currentUserIdRef.current = null;

        // Clear caches
        AuthCache.clearAll();
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

  // Initialize auth state with timeout protection
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    let timeoutId: NodeJS.Timeout;
    let cleanup: (() => void) | undefined;

    const initAuth = async () => {
      try {
        console.log('🚀 Auth initialization starting...');
        
        // Set loading timeout (30 seconds maximum)
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Auth initialization timeout after 30 seconds');
          setError('Authentication timeout - please refresh the page');
          setLoading(false);
        }, 30000);

        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        
        cleanup = () => {
          subscription.unsubscribe();
          if (timeoutId) clearTimeout(timeoutId);
        };

        // Check for existing session without racing timeouts to avoid false negatives
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session check error:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Existing session found, loading user data...');
          await handleAuthStateChange('INITIAL_SESSION', session);
          // Clear initialization timeout once auth state is handled
          clearTimeout(timeoutId);
        } else {
          console.log('❌ No existing session, user not authenticated');
          clearTimeout(timeoutId);
          setLoading(false);
        }

      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError('Failed to initialize authentication');
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    initAuth();

    // Cleanup function
    return () => {
      if (cleanup) cleanup();
      if (timeoutId) clearTimeout(timeoutId);
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