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
  avatarUrl: string | null;
  optimisticAvatarUrl: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setOptimisticAvatar: (url: string | null) => void;
  updateAvatar: (url: string | null) => void;
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
    avatarUrl: null,
    optimisticAvatarUrl: null,
  });

  // Batch all auth updates into a single state change
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchContext = useCallback(async (userId: string, background = false) => {
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

      // No cache - fetch from server (don't show loading for background refreshes)
      await fetchContextFromServer(userId, !background);
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

  const fetchContextFromServer = useCallback(async (userId: string, updateLoading = true, retryCount = 0) => {
    try {
      if (updateLoading) {
        updateAuthState({ loading: true, error: null });
      }

      // Sequential approach during initial user setup to avoid race conditions
      let membershipResult, contextResult, avatarResult;
      
      try {
        // First ensure membership (may fail during account creation)
        membershipResult = await supabase.rpc('ensure_membership_for_current_user');
      } catch (membershipError: any) {
        console.warn('Membership ensure failed (may be transient):', membershipError.message);
        // Continue anyway - this is not critical for auth context
      }

      try {
        // Get user context
        contextResult = await supabase.rpc('get_user_context_optimized', { p_user_id: userId });
      } catch (contextError: any) {
        console.warn('Context fetch failed:', contextError.message);
        
        // If this fails during initial setup, retry once after a delay
        if (retryCount === 0 && contextError.message?.includes('400')) {
          console.log('Retrying context fetch after account setup delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchContextFromServer(userId, updateLoading, 1);
        }
        throw contextError;
      }

      try {
        // Get avatar (least critical)
        avatarResult = await supabase.from('users').select('avatar_url').eq('auth_user_id', userId).maybeSingle();
      } catch (avatarError: any) {
        console.warn('Avatar fetch failed (non-critical):', avatarError.message);
        avatarResult = { data: null, error: null }; // Provide fallback
      }

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
        avatarUrl: avatarResult.data?.avatar_url || null,
        authReady: true,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Server fetch failed:', err);
      
      // Handle account creation delays gracefully 
      const isAccountCreationError = err.message?.includes('400') || err.message?.includes('406');
      
      if (updateLoading) {
        updateAuthState({
          userRole: null,
          companies: [],
          authReady: true,
          loading: false,
          // Don't show error toast for transient account creation issues
          error: isAccountCreationError ? null : (err instanceof Error ? err.message : 'Failed to load user data'),
        });
      }
    }
  }, [updateAuthState]);

  const refreshAuth = useCallback(async (silent = false) => {
    if (!authState.user?.id) {
      updateAuthState({ authReady: true, loading: false });
      return;
    }
    
    if (silent) {
      // Silent mode: update cache in background without triggering loading state
      console.debug('🔄 Silent auth refresh (background)');
      const cacheKey = `${CACHE_KEY}_${authState.user.id}`;
      CacheManager.invalidate(cacheKey);
      await fetchContext(authState.user.id, true);
    } else {
      // Normal mode: clear cache and fetch fresh data
      console.debug('🔄 Refreshing auth context');
      const cacheKey = `${CACHE_KEY}_${authState.user.id}`;
      CacheManager.invalidate(cacheKey);
      await fetchContext(authState.user.id, false);
    }
  }, [authState.user, fetchContext]);

  const handleSession = useCallback((sess: Session | null) => {
    if (sess?.user) {
      // User authenticated - immediately update session/user (synchronous)
      updateAuthState({
        session: sess,
        user: sess.user,
        error: null,
      });
      
      // Set user context for cache management
      CacheManager.setCurrentUser(sess.user.id);
      
      // Defer context fetch to avoid blocking auth state change
      // Add longer delay for newly created accounts to avoid database timing issues
      const delay = Date.now() - (sess.user.created_at ? new Date(sess.user.created_at).getTime() : 0) < 30000 ? 2000 : 0;
      setTimeout(() => {
        fetchContext(sess.user.id).catch(err => {
          console.error('Deferred context fetch failed (may be transient during account creation):', err);
        });
      }, delay);
    } else {
      // User signed out - clear everything in one update
      CacheManager.setCurrentUser(null);
      updateAuthState({
        session: null,
        user: null,
        userRole: null,
        companies: [],
        avatarUrl: null,
        optimisticAvatarUrl: null,
        authReady: true,
        loading: false,
        error: null,
      });
    }
  }, [fetchContext, updateAuthState]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initAuth = async () => {
      // Set up auth state listener FIRST to avoid missing events
      subscription = supabase.auth.onAuthStateChange((_event, newSession) => {
        handleSession(newSession);
      }).data.subscription;
      
      // Then get initial session
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
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
        avatarUrl: null,
        optimisticAvatarUrl: null,
        authReady: false,
        loading: false,
        error: null,
      });
    }
  }, [updateAuthState]);

  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  const setOptimisticAvatar = useCallback((url: string | null) => {
    updateAuthState({ optimisticAvatarUrl: url });
  }, [updateAuthState]);

  const updateAvatar = useCallback((url: string | null) => {
    updateAuthState({ 
      avatarUrl: url, 
      optimisticAvatarUrl: null // Clear optimistic when real URL is set
    });
  }, [updateAuthState]);

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshAuth,
    clearError,
    setOptimisticAvatar,
    updateAvatar,
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