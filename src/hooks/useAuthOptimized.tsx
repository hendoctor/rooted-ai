import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { CacheManager } from '@/lib/cacheManager';

interface Company {
  id: string;
  name: string;
  slug: string;
  userRole: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  companies: Company[];
  loading: boolean;
  authReady: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshAuth: (background?: boolean) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'auth_context_v3';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - longer cache for better performance

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Single state object to prevent multiple re-renders
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    userRole: null,
    companies: [],
    loading: true,
    authReady: false,
    error: null,
  });

  // Batch all auth updates into a single state change
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchContext = useCallback(async (userId: string) => {
    try {
      // Check cache first for instant loading
      const cacheKey = `${CACHE_KEY}_${userId}`;
      const cached = CacheManager.get<unknown>(cacheKey);
      
      if (cached) {
        // Use cached data immediately
        updateAuthState({
          userRole: cached.role,
          companies: cached.companies,
          authReady: true,
          loading: false,
          error: null,
        });
        
        // Background refresh if cache is getting stale
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge > CACHE_TTL * 0.7) { // Refresh when 70% expired
          // Background refresh without changing loading state
          fetchContextFromServer(userId, false);
        }
        return;
      }

      // No cache - fetch from server
      await fetchContextFromServer(userId, true);
    } catch (err) {
      console.error('Failed to fetch user context:', err);
      updateAuthState({
        userRole: null,
        companies: [],
        authReady: true,
        loading: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      });
    }
  }, [updateAuthState, fetchContextFromServer]);

  const fetchContextFromServer = useCallback(async (userId: string, updateLoading = true) => {
    try {
      if (updateLoading) {
        updateAuthState({ loading: true, error: null });
      }

      // Parallel calls for better performance
      const [membershipResult, contextResult] = await Promise.all([
        supabase.rpc('ensure_membership_for_current_user'),
        supabase.rpc('get_user_context_optimized', { p_user_id: userId })
      ]);

      if (contextResult.error) throw contextResult.error;

      const ctx = contextResult.data?.[0];
      const rawCompanies = ctx?.companies;
      const companiesData: Company[] = Array.isArray(rawCompanies)
        ? rawCompanies.map((company: Record<string, unknown>) => ({
            id: String(company.company_id || company.id || ''),
            name: String(company.company_name || company.name || ''),
            slug: String(company.company_slug || company.slug || ''),
            userRole: String(company.user_role || company.userRole || 'Member'),
            isAdmin: Boolean(company.is_admin || company.isAdmin || false)
          }))
        : [];

      const role = typeof ctx?.role === 'string' ? ctx.role : null;
      const permissions = ctx?.permissions && typeof ctx.permissions === 'object' 
        ? ctx.permissions as Record<string, unknown>
        : {};

      // Cache the results
      const cacheKey = `${CACHE_KEY}_${userId}`;
      CacheManager.set(cacheKey, {
        role,
        companies: companiesData,
        permissions,
        timestamp: Date.now()
      }, CACHE_TTL);

      // Update state in single batch
      updateAuthState({
        userRole: role,
        companies: companiesData,
        authReady: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Server fetch failed:', err);
      if (updateLoading) {
        updateAuthState({
          userRole: null,
          companies: [],
          authReady: true,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load user data',
        });
      }
    }
  }, [updateAuthState]);

  const refreshAuth = useCallback(async (background: boolean = false) => {
    if (!authState.user?.id) {
      if (!background) {
        updateAuthState({ authReady: true, loading: false });
      }
      return;
    }

    // Clear cache and fetch fresh data without disrupting UI when background
    const cacheKey = `${CACHE_KEY}_${authState.user.id}`;
    CacheManager.invalidate(cacheKey);
    await fetchContextFromServer(authState.user.id, !background);
  }, [authState.user, fetchContextFromServer, updateAuthState]);

  const handleSession = useCallback(async (sess: Session | null) => {
    if (sess?.user) {
      // User authenticated - batch update session and trigger context fetch
      updateAuthState({
        session: sess,
        user: sess.user,
        loading: true, // Only set loading once
        error: null,
      });
      
      // Set user context for cache management
      CacheManager.setCurrentUser(sess.user.id);
      
      // Fetch user context (will check cache first)
      await fetchContext(sess.user.id);
    } else {
      // User signed out - clear everything in one update
      CacheManager.setCurrentUser(null);
      updateAuthState({
        session: null,
        user: null,
        userRole: null,
        companies: [],
        authReady: true,
        loading: false,
        error: null,
      });
    }
  }, [fetchContext, updateAuthState]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
      
      // Set up auth state listener
      subscription = supabase.auth.onAuthStateChange((_event, newSession) => {
        handleSession(newSession);
      }).data.subscription;
    };

    initAuth();
    return () => subscription?.unsubscribe();
  }, [handleSession]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      CacheManager.clearUserData();
      updateAuthState({
        user: null,
        session: null,
        userRole: null,
        companies: [],
        authReady: false,
        loading: false,
        error: null,
      });
    }
  }, [updateAuthState]);

  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshAuth,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};