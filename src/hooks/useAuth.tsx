// Mobile-optimized authentication hook - best practices implementation
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

// Keys used for persisting auth data across refreshes
const ROLE_STORAGE_KEY = 'auth_user_role';
const COMPANIES_STORAGE_KEY = 'auth_companies';
const AUTH_STATE_KEY = 'auth_state_version';

// Helper function to persist auth data safely
const persistAuthData = (role: string, companies: Company[]) => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
    localStorage.setItem(AUTH_STATE_KEY, timestamp.toString());
    console.log('💾 Auth data persisted:', { role, companiesCount: companies.length, timestamp });
  } catch (e) {
    console.warn('Unable to persist auth data:', e);
  }
};

// Helper function to clear auth data safely
const clearAuthData = () => {
  try {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(COMPANIES_STORAGE_KEY);
    localStorage.removeItem(AUTH_STATE_KEY);
    console.log('🧹 Auth data cleared from localStorage');
  } catch (e) {
    console.warn('Unable to clear auth data:', e);
  }
};

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
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ROLE_STORAGE_KEY);
    }
    return null;
  });
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const performance = usePerformanceMonitor();

  // Fetch user profile data with timeout and retry logic
  const fetchUserProfile = useCallback(async (userId: string, attempt = 1): Promise<{ role: string; companies: Company[] }> => {
    if (!userId) {
      console.warn('No userId provided to fetchUserProfile');
      throw new Error('No user ID provided');
    }

    console.log(`👤 Fetching user profile for: ${userId} (attempt ${attempt})`);

    return new Promise((resolve, reject) => {
      // 8-second timeout for profile fetch (increased for mobile)
      const profileTimeout = setTimeout(() => {
        console.warn('⚠️ Profile fetch timeout - rejecting to preserve existing state');
        reject(new Error('Profile fetch timeout'));
      }, 8000);

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_profile', {
            p_user_id: userId
          });

          clearTimeout(profileTimeout);

          if (error) {
            console.error('Error fetching user profile:', error);
            throw error;
          }

          if (!data || data.length === 0) {
            console.warn('No user profile data returned');
            throw new Error('No profile data found');
          }

          const profileData = data[0];
          const role = profileData.user_role;
          
          // Validate role - reject if invalid to prevent downgrades
          if (!role || !['Admin', 'Client', 'Manager'].includes(role)) {
            console.error('Invalid role returned from database:', role);
            throw new Error('Invalid role data');
          }
          
          // Parse companies from jsonb
          let companiesData: Company[] = [];
          if (profileData.companies && Array.isArray(profileData.companies)) {
            companiesData = profileData.companies.map((company: any) => ({
              id: company.id,
              name: company.name,
              slug: company.slug,
              userRole: company.userRole,
              isAdmin: company.isAdmin
            }));
          }

          console.log('✅ User profile loaded successfully:', { role, companiesCount: companiesData.length });
          resolve({ role, companies: companiesData });
        } catch (error) {
          clearTimeout(profileTimeout);
          console.error(`Failed to fetch user profile (attempt ${attempt}):`, error);
          
          // Implement retry logic with exponential backoff
          if (attempt < 3) {
            const retryDelay = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`⏳ Retrying profile fetch in ${retryDelay}ms...`);
            setTimeout(() => {
              fetchUserProfile(userId, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay);
          } else {
            reject(error);
          }
        }
      };

      fetchProfile();
    });
  }, []);

  // Handle auth state changes - SYNCHRONOUS to prevent deadlocks
  const handleAuthStateChange = useCallback((event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    if (newSession?.user) {
      // Set basic auth state immediately and synchronously
      setUser(newSession.user);
      setSession(newSession);
      setError(null);
      setLoading(false); // Clear loading immediately for responsive UI
      
      // Defer profile fetching to prevent auth listener deadlock
      setTimeout(() => {
        performance.trackProfileFetch();
        fetchUserProfile(newSession.user.id)
          .then(({ role, companies: companiesData }) => {
            performance.trackProfileComplete();
            setUserRole(role);
            setCompanies(companiesData);
            // Persist role and company info for reliable reloads
            persistAuthData(role, companiesData);
            console.log('✅ User profile loaded successfully');
          })
          .catch((error) => {
            performance.trackProfileComplete();
            console.error('Error loading user profile:', error);
            // Enhanced fallback logic - preserve existing authenticated state
            setUserRole(prevRole => {
              // Get stored role from localStorage as backup
              const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
              
              // Priority order: existing role > stored role > default
              if (prevRole && prevRole !== 'Client') {
                console.warn('⚠️ Profile fetch failed - preserving existing role:', prevRole);
                return prevRole;
              }
              
              if (storedRole && storedRole !== 'Client') {
                console.warn('⚠️ Profile fetch failed - using stored role:', storedRole);
                setUserRole(storedRole); // Ensure localStorage sync
                return storedRole;
              }
              
              // Only default to 'Client' for truly new users
              console.log('📝 New user - defaulting to Client role');
              return 'Client';
            });
            setCompanies(prevCompanies => {
              if (prevCompanies && prevCompanies.length > 0) return prevCompanies;
              const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
              return stored ? JSON.parse(stored) : [];
            });
            setError('Profile data unavailable, using existing data');
          });
      }, 0);
    } else {
      // User signed out - synchronous cleanup
      console.log('🚪 User signed out');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setError(null);
      setLoading(false);
      clearAuthData();
    }
  }, [fetchUserProfile]);

  // Enhanced refresh auth data with better state preservation
  const refreshAuth = useCallback(async () => {
    if (!user?.id) {
      console.warn('No user ID available for refresh');
      return;
    }

    console.log('🔄 Refreshing auth data...');
    setError(null);

    // Capture current state before attempting refresh
    const currentRole = userRole;
    const currentCompanies = companies;

    try {
      const { role, companies: companiesData } = await fetchUserProfile(user.id);
      
      // Validate role change - prevent downgrades without explicit admin action
      if (currentRole === 'Admin' && role !== 'Admin') {
        console.warn('⚠️ Potential admin role downgrade detected - preserving admin role');
        console.warn(`Current: ${currentRole}, New: ${role}`);
        return; // Don't apply the change
      }
      
      setUserRole(role);
      setCompanies(companiesData);
      
      // Persist to localStorage immediately
      persistAuthData(role, companiesData);
      console.log('✅ Auth data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      
      // Enhanced fallback logic - check localStorage for consistency
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
      
      if (storedRole && storedRole !== currentRole) {
        console.log('🔄 Syncing role from localStorage:', storedRole);
        setUserRole(storedRole);
      }
      
      if (storedCompanies) {
        try {
          const parsedCompanies = JSON.parse(storedCompanies);
          if (parsedCompanies.length !== currentCompanies.length) {
            console.log('🔄 Syncing companies from localStorage');
            setCompanies(parsedCompanies);
          }
        } catch (e) {
          console.warn('Failed to parse stored companies:', e);
        }
      }
      
      console.warn('⚠️ Preserving existing auth state due to refresh failure');
      setError('Profile data temporarily unavailable');
    }
  }, [user?.id, userRole, companies, fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);
      await supabase.auth.signOut();
      // Clear any persisted auth data
      clearAuthData();
      // State will be cleared by handleAuthStateChange
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
  }, [toast]);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Initialize auth with timeout protection
  useEffect(() => {
    console.log('🚀 Initializing auth...');
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        performance.trackAuthInit();
        
        // Set 10-second timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth initialization timeout - clearing loading state');
            setLoading(false);
            setError('Authentication took too long - please refresh');
          }
        }, 10000);

        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return () => subscription.unsubscribe();
        
        // Clear timeout since we got a response
        clearTimeout(authTimeout);
        
        if (error) {
          console.warn('Session error:', error);
          setError('Failed to restore session');
          setLoading(false);
          return () => subscription.unsubscribe();
        }

        if (session?.user) {
          console.log('✅ Found existing session');
          performance.trackAuthComplete();
          handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          console.log('❌ No existing session');
          performance.trackAuthComplete();
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        if (mounted) {
          console.error('Auth init failed:', error);
          setError('Failed to initialize authentication');
          setLoading(false);
        }
        return () => {};
      }
    };

    const cleanup = initAuth();
    
    return () => {
      mounted = false;
      clearTimeout(authTimeout);
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
    clearError
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
      clearError: () => {}
    };
  }
  return context;
};