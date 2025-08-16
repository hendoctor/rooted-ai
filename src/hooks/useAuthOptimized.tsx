// Optimized authentication hook with zero-flicker performance
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

interface UserContext {
  user: User | null;
  session: Session | null;
  role: string | null;
  companies: Company[];
  isAdmin: boolean;
  accessibleRoutes: Set<string>;
  permissions: Map<string, boolean>;
}

interface AuthContextType extends UserContext {
  loading: boolean;
  error: string | null;
  
  // Actions
  signOut: () => Promise<void>;
  refreshContext: () => Promise<void>;
  requireRole: (roles: string[], companyId?: string) => boolean;
  hasPermission: (route: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Persistent cache with background refresh
class AuthContextCache {
  private static readonly CACHE_KEY = 'auth_context_v2';
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  static get(): UserContext | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      
      // Always return cached data for instant UI, check TTL for background refresh
      return {
        ...data,
        accessibleRoutes: new Set(data.accessibleRoutes || []),
        permissions: new Map(data.permissions || [])
      };
    } catch {
      return null;
    }
  }
  
  static set(context: UserContext): void {
    try {
      const cacheData = {
        data: {
          ...context,
          accessibleRoutes: Array.from(context.accessibleRoutes),
          permissions: Array.from(context.permissions.entries())
        },
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache auth context:', error);
    }
  }
  
  static shouldRefresh(): boolean {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return true;
      
      const { timestamp } = JSON.parse(cached);
      return Date.now() - timestamp > this.CACHE_TTL;
    } catch {
      return true;
    }
  }
  
  static clear(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth cache:', error);
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userContext, setUserContext] = useState<UserContext>(() => {
    // Initialize with cached data for instant UI
    const cached = AuthContextCache.get();
    return cached || {
      user: null,
      session: null,
      role: null,
      companies: [],
      isAdmin: false,
      accessibleRoutes: new Set(['/]),
      permissions: new Map()
    };
  });
  
  const [loading, setLoading] = useState(!userContext.user); // Only show loading if no cached user
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Optimized context builder - server-verified, single query
  const buildUserContext = useCallback(async (session: Session | null): Promise<UserContext> => {
    if (!session?.user) {
      return {
        user: null,
        session: null,
        role: null,
        companies: [],
        isAdmin: false,
        accessibleRoutes: new Set(['/']),
        permissions: new Map()
      };
    }

    try {
      // Single query to get complete user context
      const { data: contextData, error } = await supabase.rpc('get_user_context_optimized', {
        user_id: session.user.id
      });

      if (error) {
        console.warn('Failed to fetch user context:', error);
        // Return minimal safe context
        return {
          user: session.user,
          session,
          role: 'Client',
          companies: [],
          isAdmin: false,
          accessibleRoutes: new Set(['/', '/profile']),
          permissions: new Map()
        };
      }

      const context = contextData[0] || {};
      const companies: Company[] = (context.companies || []).map((c: any) => ({
        id: c.company_id,
        name: c.company_name,
        slug: c.company_slug,
        userRole: c.user_role,
        isAdmin: c.is_admin
      }));

      const isAdmin = context.role === 'Admin';
      const accessibleRoutes = new Set<string>(['/', '/profile']);
      const permissions = new Map<string, boolean>();
      
      // Build accessible routes
      if (isAdmin) {
        accessibleRoutes.add('/admin');
      }
      
      companies.forEach(company => {
        accessibleRoutes.add(`/${company.slug}`);
      });

      // Build permissions map for instant lookup
      (context.permissions || []).forEach((perm: any) => {
        if (perm.access) {
          permissions.set(perm.page, true);
        }
      });

      return {
        user: session.user,
        session,
        role: context.role || 'Client',
        companies,
        isAdmin,
        accessibleRoutes,
        permissions
      };
    } catch (error) {
      console.error('Error building user context:', error);
      // Return safe fallback
      return {
        user: session.user,
        session,
        role: 'Client',
        companies: [],
        isAdmin: false,
        accessibleRoutes: new Set(['/', '/profile']),
        permissions: new Map()
      };
    }
  }, []);

  // Background refresh without UI disruption
  const refreshContextSilently = useCallback(async () => {
    if (!userContext.session) return;
    
    try {
      const newContext = await buildUserContext(userContext.session);
      setUserContext(newContext);
      AuthContextCache.set(newContext);
    } catch (error) {
      console.warn('Silent context refresh failed:', error);
    }
  }, [userContext.session, buildUserContext]);

  // Public refresh method
  const refreshContext = useCallback(async () => {
    if (!userContext.session) return;
    
    try {
      setLoading(true);
      const newContext = await buildUserContext(userContext.session);
      setUserContext(newContext);
      AuthContextCache.set(newContext);
      setError(null);
    } catch (error) {
      console.error('Context refresh failed:', error);
      setError('Failed to refresh user context');
    } finally {
      setLoading(false);
    }
  }, [userContext.session, buildUserContext]);

  // Auth state change handler
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('🔄 Auth state change:', event, !!session?.user);

    if (!session?.user) {
      // User signed out
      setUserContext({
        user: null,
        session: null,
        role: null,
        companies: [],
        isAdmin: false,
        accessibleRoutes: new Set(['/']),
        permissions: new Map()
      });
      AuthContextCache.clear();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const newContext = await buildUserContext(session);
      setUserContext(newContext);
      AuthContextCache.set(newContext);
      setError(null);
      
      // Schedule background refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(refreshContextSilently, 30000); // 30 seconds
    } catch (error) {
      console.error('Auth state change error:', error);
      setError('Authentication error occurred');
    } finally {
      setLoading(false);
    }
  }, [buildUserContext, refreshContextSilently]);

  // Optimized role check - no async, uses cached permissions
  const requireRole = useCallback((roles: string[], companyId?: string): boolean => {
    if (!userContext.role) return false;
    if (userContext.isAdmin) return true;
    
    if (roles.includes(userContext.role)) {
      if (companyId) {
        return userContext.companies.some(c => 
          c.id === companyId && roles.includes(c.userRole)
        );
      }
      return true;
    }
    
    return false;
  }, [userContext.role, userContext.isAdmin, userContext.companies]);

  // Instant permission check
  const hasPermission = useCallback((route: string): boolean => {
    if (userContext.isAdmin) return true;
    return userContext.permissions.get(route) || userContext.accessibleRoutes.has(route);
  }, [userContext.isAdmin, userContext.permissions, userContext.accessibleRoutes]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      AuthContextCache.clear();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out properly. Redirecting...",
        variant: "destructive",
      });
      window.location.href = '/';
    }
  }, [toast]);

  const clearError = useCallback(() => setError(null), []);

  // Initialize auth with cache-first approach
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initAuth = async () => {
      try {
        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Session check error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // If we have cached data and it's recent, use it while refreshing in background
          if (userContext.user && !AuthContextCache.shouldRefresh()) {
            setLoading(false);
            setTimeout(refreshContextSilently, 100); // Background refresh
          } else {
            await handleAuthStateChange('INITIAL_SESSION', session);
          }
        } else {
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [handleAuthStateChange, userContext.user, refreshContextSilently]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo((): AuthContextType => ({
    ...userContext,
    loading,
    error,
    signOut,
    refreshContext,
    requireRole,
    hasPermission,
    clearError
  }), [userContext, loading, error, signOut, refreshContext, requireRole, hasPermission, clearError]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};