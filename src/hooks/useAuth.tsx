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
  forceRefresh: () => void;
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
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const fetchRetryCount = useRef(0);
  const maxRetries = 3;
  const { toast } = useToast();

  // Get/set last user ID from session storage for navigation detection
  const getLastUserId = (): string | null => {
    try {
      return sessionStorage.getItem('last_user_id');
    } catch {
      return null;
    }
  };

  const setLastUserId = (userId: string | null): void => {
    try {
      if (userId) {
        sessionStorage.setItem('last_user_id', userId);
      } else {
        sessionStorage.removeItem('last_user_id');
      }
    } catch {
      // Ignore session storage errors
    }
  };

  // Fetch user role and companies with cache-first approach
  const fetchUserData = useCallback(async (userId: string, isRetry = false) => {
    if (!userId) return { role: 'Client', companies: [] };
    
    console.log('👤 Fetching user data for:', userId, isRetry ? '(retry)' : '');
    
    // Check cache first - if exists, use it without showing loading
    const cacheKey = `user_data_${userId}`;
    const cached = CacheManager.get<{
      role: string;
      companies: Company[];
    }>(cacheKey);

    if (cached && !isRetry) {
      console.log('📦 Using cached user data, refreshing in background');
      setUserRole(cached.role);
      setCompanies(cached.companies);
      setLoading(false);
      
      // Silent background refresh
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_context_optimized', {
            p_user_id: userId
          });
          
          if (!error && data && data.length > 0) {
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
            
            const result = { role, companies: companiesData };
            CacheManager.set(cacheKey, result, 900000);
            setUserRole(role);
            setCompanies(companiesData);
          }
        } catch (error) {
          console.error('Silent refresh failed:', error);
        }
      }, 100);
      
      return cached;
    }

    // No cache - show loading and fetch
    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    try {

      // Use optimized function that gets everything in one call
      const { data, error } = await supabase.rpc('get_user_context_optimized', {
        p_user_id: userId
      });

      if (error) {
        console.warn('Failed to fetch user context:', error);
        // Fallback to individual calls
        const roleResult = await fetchUserRole(userId);
        const companiesResult = await fetchUserCompanies(roleResult);
        const result = { role: roleResult, companies: companiesResult };
        
        // Cache the result for 15 minutes
        CacheManager.set(cacheKey, result, 900000);
        return result;
      }

      let role = 'Client';
      let companiesData: Company[] = [];

      if (data && data.length > 0) {
        const userData = data[0];
        role = userData.role || 'Client';
        const companiesRaw = userData.companies || [];
        companiesData = Array.isArray(companiesRaw) ? companiesRaw.map((company: any) => ({
          id: company.company_id,
          name: company.company_name,
          slug: company.company_slug,
          userRole: company.user_role,
          isAdmin: company.is_admin
        })) : [];
      }

      const result = { role, companies: companiesData };
      
      // Cache the result for 15 minutes
      CacheManager.set(cacheKey, result, 900000);
      
      // Reset retry count on success
      fetchRetryCount.current = 0;
      console.log('✅ User data loaded successfully');
      
      return result;
    } catch (error) {
      console.warn('Error fetching user data:', error);
      
      // Try to use cached data as fallback
      const cacheKey = `user_data_${userId}`;
      const cached = CacheManager.get<{
        role: string;
        companies: Company[];
      }>(cacheKey);

      if (cached) {
        console.log('📦 Using cached data as fallback');
        return cached;
      }
      
      return { role: 'Client', companies: [] };
    } finally {
      setLoading(false);
    }
  }, [loadingTimeout, maxRetries]);

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
      // Clear cached data for this user
      const cacheKey = `user_data_${user.id}`;
      CacheManager.invalidate(cacheKey);
      fetchRetryCount.current = 0; // Reset retry count
      
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

  // Force refresh for stuck states
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refresh requested');
    setError(null);
    fetchRetryCount.current = 0;
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    if (user?.id) {
      CacheManager.invalidate(`user_data_${user.id}`);
      fetchUserData(user.id);
    } else {
      // Try to get session again
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          fetchUserData(session.user.id);
        }
      });
    }
  }, [user, fetchUserData, loadingTimeout]);

  // Handle auth state changes - CRITICAL: must be synchronous
  const handleAuthStateChange = useCallback((event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    try {
      if (newSession?.user) {
        const userId = newSession.user.id;
        const lastUserId = getLastUserId();

        // Only clear caches for actual user changes, not navigation returns
        if (userId !== lastUserId) {
          console.log('👤 User changed, clearing user-specific caches');
          CacheManager.clearUserData();
          setLastUserId(userId);
        } else {
          console.log('👤 Same user returning, keeping caches');
        }

        // Set basic auth state immediately (synchronous)
        setUser(newSession.user);
        setSession(newSession);
        setError(null);

        // Defer async work to prevent deadlock
        setTimeout(async () => {
          try {
            const { role, companies: companiesData } = await fetchUserData(userId);
            setUserRole(role);
            setCompanies(companiesData);
          } catch (error) {
            console.error('Deferred auth data fetch error:', error);
            setError('Failed to load user data');
          }
        }, 0);
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanies([]);
        setLastUserId(null);
        CacheManager.clearAll();
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      setError('Authentication error occurred');
      setLoading(false);
    }
  }, [fetchUserData]);

  // Sign out with cleanup
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      CacheManager.clearAll();
      setLastUserId(null);
      
      // Clear any pending timeouts
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      
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
  }, [toast, loadingTimeout]);

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
          handleAuthStateChange('INITIAL_SESSION', session);
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
    clearError,
    forceRefresh
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
      clearError: () => {},
      forceRefresh: () => {}
    };
  }
  return context;
};