import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { authCache } from './useAuthCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { display_name?: string } | null;
  userRole: string | null;
  clientName: string | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  setUserRole: (role: string | null) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple session-based role persistence without encryption
const ROLE_STORAGE_KEY = 'auth_role_simple';
const SESSION_TIMEOUT = 10000; // 10 seconds max for any auth operation

const saveRoleSimple = (email: string, role: string, clientName: string | null) => {
  if (role !== 'Admin') return; // Only persist Admin roles
  
  try {
    const backup = {
      email,
      role,
      clientName,
      timestamp: Date.now()
    };
    sessionStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(backup));
  } catch (error) {
    console.warn('Simple role save failed:', error);
  }
};

const loadRoleSimple = (email: string): { role: string; clientName: string | null } | null => {
  try {
    const stored = sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (!stored) return null;
    
    const backup = JSON.parse(stored);
    if (!backup || backup.email !== email) return null;
    
    // Check if stored within last 30 minutes
    const minutesSince = (Date.now() - backup.timestamp) / (1000 * 60);
    if (minutesSince > 30) {
      sessionStorage.removeItem(ROLE_STORAGE_KEY);
      return null;
    }
    
    return {
      role: backup.role,
      clientName: backup.clientName
    };
  } catch (error) {
    console.warn('Simple role load failed:', error);
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
    return null;
  }
};

const clearRoleSimple = () => {
  try {
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
  } catch (error) {
    console.warn('Role clear failed:', error);
  }
};

// Timeout wrapper for database calls
const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = SESSION_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ display_name?: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const authSubscriptionRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Force loading to false after maximum timeout
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('⏰ Auth loading timeout - forcing completion');
        setLoading(false);
      }, SESSION_TIMEOUT);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  // Optimized role fetching with caching and timeout
  const fetchUserRole = useCallback(async (userEmail: string, userId: string) => {
    if (!userEmail || !userId) {
      console.warn('Missing email or user ID for role fetch');
      return { role: 'Client', clientName: null };
    }

    // Check cache first
    const cached = authCache.getUserRole(userId);
    if (cached) {
      console.log('🎯 Using cached role:', cached);
      return cached;
    }

    try {
      console.log('🔍 Fetching role for user:', userEmail);
      
      let roleData: any = null;
      let roleError: any = null;

      try {
        const roleResponse = await Promise.race([
          supabase.rpc('get_user_role_secure', { user_email: userEmail }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        roleData = (roleResponse as any).data;
        roleError = (roleResponse as any).error;
      } catch (timeoutError) {
        roleError = timeoutError;
      }

      if (roleError) {
        console.warn('Primary role fetch failed:', roleError);
        
        try {
          const backupResponse = await Promise.race([
            supabase.rpc('get_user_role_by_auth_id', { auth_user_id: userId }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          const backupData = (backupResponse as any).data;
          const backupError = (backupResponse as any).error;
          
          if (backupError || !backupData) {
            throw new Error('Backup method failed');
          }
          
          const result = { 
            role: backupData?.role || 'Client', 
            clientName: backupData?.client_name || null 
          };
          authCache.setUserRole(userId, result.role, result.clientName);
          return result;
        } catch (backupError) {
          console.error('Both role fetch methods failed');
          const fallback = { role: 'Client', clientName: null };
          authCache.setUserRole(userId, fallback.role, fallback.clientName);
          return fallback;
        }
      }

      const result = { 
        role: roleData?.role || 'Client', 
        clientName: roleData?.client_name || null 
      };
      
      // Cache the result
      authCache.setUserRole(userId, result.role, result.clientName);
      console.log('✅ Role fetched and cached:', result);
      return result;
    } catch (error) {
      console.error('Role fetch error:', error);
      const fallback = { role: 'Client', clientName: null };
      authCache.setUserRole(userId, fallback.role, fallback.clientName);
      return fallback;
    }
  }, []);

  // Optimized profile fetching
  const fetchProfile = useCallback(async (userEmail: string) => {
    try {
      const profileResponse = await Promise.race([
        supabase
          .from('users')
          .select('display_name')
          .eq('email', userEmail)
          .maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      
      const profileData = (profileResponse as any).data;
      const profileError = (profileResponse as any).error;

      if (!profileError && profileData) {
        setProfile({ display_name: profileData.display_name });
      }
    } catch (error) {
      console.warn('Profile fetch failed (non-critical):', error);
    }
  }, []);

  // Streamlined auth state handler
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, newSession?.user?.email || 'no user');
    
    setError(null);
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user) {
      const userEmail = newSession.user.email;
      const userId = newSession.user.id;

      if (!userEmail) {
        console.error('User has no email address');
        setUserRole('Client');
        setClientName(null);
        setLoading(false);
        return;
      }

      try {
        // Check simple backup first
        const backup = loadRoleSimple(userEmail);
        if (backup?.role === 'Admin') {
          console.log('📋 Using simple role backup');
          setUserRole(backup.role);
          setClientName(backup.clientName);
        }

        // For SIGNED_IN events, add a small delay to ensure database is ready
        if (event === 'SIGNED_IN') {
          console.log('🔄 Login detected, waiting for database sync...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

        // Fetch current role with timeout
        const rolePromise = fetchUserRole(userEmail, userId);
        const profilePromise = fetchProfile(userEmail);
        
        // Set a maximum wait time for both operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth operations timed out')), SESSION_TIMEOUT)
        );

        try {
          const [roleResult] = await Promise.race([
            Promise.all([rolePromise, profilePromise]),
            timeoutPromise
          ]) as [{ role: string; clientName: string | null }, void];

          console.log('✅ Setting role:', roleResult.role);
          setUserRole(roleResult.role);
          setClientName(roleResult.clientName);
          
          // Save simple backup for Admin roles
          if (roleResult.role === 'Admin') {
            saveRoleSimple(userEmail, roleResult.role, roleResult.clientName);
          }
        } catch (timeoutError) {
          console.warn('Auth operations timed out, using fallback');
          if (!backup) {
            setUserRole('Client');
            setClientName(null);
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUserRole('Client');
        setClientName(null);
      }
    } else {
      // User logged out
      console.log('👋 User logged out - clearing state');
      setProfile(null);
      setUserRole(null);
      setClientName(null);
      clearRoleSimple();
      authCache.invalidate();
    }

    setLoading(false);
  }, [fetchUserRole, fetchProfile]);

  // Initialize auth system
  useEffect(() => {
    if (initialized) return;

    console.log('🚀 Initializing optimized auth system');
    
    // Set loading timeout as fallback
    const initTimeout = setTimeout(() => {
      console.warn('⏰ Auth initialization timeout');
      setLoading(false);
    }, SESSION_TIMEOUT);
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    authSubscriptionRef.current = subscription;

    // Check for existing session with retry logic
    const checkSession = async (retryCount = 0) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          if (retryCount < 2) {
            console.log('Retrying session check...');
            setTimeout(() => checkSession(retryCount + 1), 1000);
            return;
          }
          setLoading(false);
          return;
        }

        console.log('🔍 Initial session check:', session?.user?.email || 'no session');
        handleAuthStateChange('INITIAL_SESSION', session);
      } catch (error) {
        console.error('Session check failed:', error);
        if (retryCount < 2) {
          setTimeout(() => checkSession(retryCount + 1), 1000);
          return;
        }
        setLoading(false);
      }
    };

    checkSession();
    clearTimeout(initTimeout);

    setInitialized(true);

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      clearTimeout(initTimeout);
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, [initialized, handleAuthStateChange]);

  // Refresh auth data
  const refreshAuth = useCallback(async () => {
    if (!user?.email || !user?.id) return;
    
    console.log('🔄 Refreshing auth data');
    setLoading(true);
    
    // Clear cache for this user
    authCache.clearUserData(user.id);
    
    try {
      const roleResult = await fetchUserRole(user.email, user.id);
      setUserRole(roleResult.role);
      setClientName(roleResult.clientName);
      
      if (roleResult.role === 'Admin') {
        saveRoleSimple(user.email, roleResult.role, roleResult.clientName);
      }
      
      await fetchProfile(user.email);
    } catch (error) {
      console.error('Auth refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserRole, fetchProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    console.log('🚪 Signing out user');
    
    try {
      await supabase.auth.signOut();
      
      // Clear all state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setClientName(null);
      setError(null);
      setLoading(false);
      clearRoleSimple();
      authCache.invalidate();
      
      console.log('✅ Successfully signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still clear state even if sign out failed
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setClientName(null);
      setLoading(false);
      clearRoleSimple();
      authCache.invalidate();
    }
  }, []);

  const value = {
    user,
    session,
    profile,
    userRole,
    clientName,
    loading,
    error,
    signOut,
    setUserRole,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};