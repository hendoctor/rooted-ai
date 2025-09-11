import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Company {
  id: string;
  name: string;
  slug: string;
  userRole: string;
  isAdmin: boolean;
}

interface CachedContext {
  role: string;
  companies: Company[];
  permissions: Record<string, unknown>;
  timestamp: number;
}

const CACHE_KEY = 'auth_context_v2';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  companies: Company[];
  loading: boolean;
  authReady: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadCache = (): CachedContext | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedContext;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveCache = (ctx: CachedContext) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async (id: string) => {
    const { data, error } = await supabase.rpc('get_user_context_optimized', {
      p_user_id: id,
    });
    if (error) throw error;
    const ctx = data && data[0];
    const companiesData: Company[] = Array.isArray(ctx?.companies) ? ctx.companies : [];
    const role = ctx?.role ?? null;
    setUserRole(role);
    setCompanies(companiesData);
    saveCache({ role, companies: companiesData, permissions: ctx?.permissions ?? {}, timestamp: Date.now() });
    setAuthReady(true);
  }, []);

    const refreshAuth = useCallback(async () => {
      if (!user?.id) {
        // No user - mark auth as ready so the app can render public routes
        setAuthReady(true);
        return;
      }
      try {
        await fetchContext(user.id);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh auth';
        setError(message);
        // Even if context fetch fails, allow the application to continue
        // so the user can see error messages or retry actions
        setAuthReady(true);
      }
    }, [user, fetchContext]);

  const handleSession = useCallback(
    async (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const cached = loadCache();
        if (cached) {
          setUserRole(cached.role);
          setCompanies(cached.companies);
          setAuthReady(true);
          setLoading(false);
          if (Date.now() - cached.timestamp > CACHE_TTL) {
            refreshAuth();
          }
        } else {
          setLoading(true);
          await refreshAuth();
          setLoading(false);
        }
      } else {
        setUserRole(null);
        setCompanies([]);
        // For public users without a session, mark auth as ready immediately
        // so the application can render public routes without waiting
        setAuthReady(true);
        clearCache();
        setLoading(false);
      }
    },
    [refreshAuth]
  );

    useEffect(() => {
      let subscription: { unsubscribe: () => void } | null = null;
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await handleSession(session);
        subscription = supabase.auth.onAuthStateChange((_event, newSession) => {
          handleSession(newSession);
        }).data.subscription;
      })();
      return () => subscription?.unsubscribe();
    }, [handleSession]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearCache();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setAuthReady(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    session,
    userRole,
    companies,
    loading,
    authReady,
    error,
    signOut,
    refreshAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

