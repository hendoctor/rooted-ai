// Reliable authentication hook with centralized RBAC and session management
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthGuard, AuthCache } from '@/utils/authGuard';
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
  const initializingRef = useRef(false);
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
  const fetchUserCompanies = useCallback(async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_companies');

      if (error) {
        console.warn('Failed to fetch user companies:', error);
        return [];
      }

      return (data || []).map((company: any) => ({
        id: company.company_id,
        name: company.company_name,
        slug: company.company_slug,
        userRole: company.user_role,
        isAdmin: company.is_admin
      }));
    } catch (error) {
      console.warn('Error fetching user companies:', error);
      return [];
    }
  }, []);

  // Check if user has required role
  const requireRole = useCallback((roles: string[], companyId?: string): boolean => {
    if (!userRole) return false;

    // Admin always has access
    if (userRole === 'Admin') return true;

    // Check global role
    if (roles.includes(userRole)) {
      // If company-specific check needed
      if (companyId) {
        return companies.some(c => 
          c.id === companyId && roles.includes(c.userRole)
        );
      }
      return true;
    }

    return false;
  }, [userRole, companies]);

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
      
      const [roleResult, companiesResult] = await Promise.all([
        fetchUserRole(user.id),
        fetchUserCompanies()
      ]);

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

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    try {
      if (newSession?.user) {
        // User signed in
        setUser(newSession.user);
        setSession(newSession);
        
        // Cache session
        AuthCache.setSession(newSession);
        
        // Fetch additional user data
        const [roleResult, companiesResult] = await Promise.all([
          fetchUserRole(newSession.user.id),
          fetchUserCompanies()
        ]);

        setUserRole(roleResult);
        setCompanies(companiesResult);
        setError(null);
      } else {
        // User signed out
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanies([]);
        
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

  // Initialize auth state
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initAuth = async () => {
      try {
        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session check error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          setLoading(false);
        }

        // Clean up subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    initAuth();
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