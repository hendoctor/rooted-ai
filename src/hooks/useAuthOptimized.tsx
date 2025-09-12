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
  refreshAuth: () => Promise<void>;
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
      const cached = CacheManager.get<any>(cacheKey);
      
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
  }, [updateAuthState]);

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
        ? rawCompanies.map((company: any) => ({
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

  const refreshAuth = useCallback(async () => {
    // Enhanced refresh with session validation
    try {
      console.log('🔄 Starting auth refresh...');
      
      // First validate current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error during refresh:', error);
        updateAuthState({
          user: null,
          session: null,
          userRole: null,
          companies: [],
          authReady: true,
          loading: false,
          error: 'Session validation failed'
        });
        return;
      }

      if (!session?.user) {
        console.log('No valid session found during refresh');
        updateAuthState({
          user: null,
          session: null,
          userRole: null,
          companies: [],
          authReady: true,
          loading: false,
          error: null
        });
        return;
      }

      // Clear cache and fetch fresh data
      const cacheKey = `${CACHE_KEY}_${session.user.id}`;
      CacheManager.invalidate(cacheKey);
      
      // Update session state
      updateAuthState({
        session,
        user: session.user,
        loading: true,
        error: null
      });
      
      await fetchContext(session.user.id);
      console.log('✅ Auth refresh completed');
      
    } catch (error) {
      console.error('Auth refresh failed:', error);
      updateAuthState({
        authReady: true,
        loading: false,
        error: error instanceof Error ? error.message : 'Refresh failed'
      });
    }
  }, [fetchContext, updateAuthState]);

  const handleSession = useCallback(async (sess: Session | null) => {
    try {
      if (sess?.user) {
        console.log('📝 Processing authenticated session');
        
        // Validate session before processing
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = sess.expires_at || 0;
        
        if (expiresAt <= now) {
          console.warn('⚠️ Session already expired, attempting refresh...');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error || !data.session) {
            console.error('Session refresh failed:', error);
            handleSession(null);
            return;
          }
          
          // Use refreshed session
          sess = data.session;
        }

        // User authenticated - batch update session and trigger context fetch
        updateAuthState({
          session: sess,
          user: sess.user,
          loading: true,
          error: null,
        });
        
        // Set user context for cache management
        CacheManager.setCurrentUser(sess.user.id);
        
        // Fetch user context (will check cache first)
        await fetchContext(sess.user.id);
      } else {
        console.log('📝 Processing signed out session');
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
    } catch (error) {
      console.error('Session handling error:', error);
      updateAuthState({
        session: null,
        user: null,
        userRole: null,
        companies: [],
        authReady: true,
        loading: false,
        error: error instanceof Error ? error.message : 'Session error'
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
    console.log('🚪 Signing out user...');
    try {
      // Clear local state immediately to prevent UI flicker
      updateAuthState({
        user: null,
        session: null,
        userRole: null,
        companies: [],
        authReady: false,
        loading: false,
        error: null,
      });
      
      // Clear cache
      CacheManager.clearUserData();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('✅ Sign out completed');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if sign out fails, ensure local state is cleared
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