// Mobile-optimized authentication hook - best practices implementation
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { activityLogger } from '@/utils/activityLogger';

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
  
  // Initialize from localStorage immediately to prevent state loss during refresh
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      console.log('🔄 Initial role from localStorage:', stored);
      return stored;
    }
    return null;
  });
  
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      console.log('🔄 Initial companies from localStorage:', parsed.length);
      return parsed;
    }
    return [];
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const performance = usePerformanceMonitor();

  // Enhanced user profile fetch with better error handling and validation
  const fetchUserProfile = useCallback(async (userId: string, attempt = 1): Promise<{ role: string; companies: Company[] }> => {
    if (!userId) {
      console.warn('❌ No userId provided to fetchUserProfile');
      throw new Error('No user ID provided');
    }

    console.log(`👤 Fetching user profile for: ${userId} (attempt ${attempt})`);

    return new Promise((resolve, reject) => {
      // 12-second timeout for profile fetch (increased for mobile/slow connections)
      const profileTimeout = setTimeout(() => {
        console.warn('⚠️ Profile fetch timeout - preserving existing state');
        reject(new Error('Profile fetch timeout'));
      }, 12000);

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_profile', {
            p_user_id: userId
          });

          clearTimeout(profileTimeout);

          if (error) {
            console.error('❌ Error fetching user profile:', error);
            throw error;
          }

          if (!data || data.length === 0) {
            console.warn('⚠️ No user profile data returned, checking database');
            
            // Fallback: try to ensure user exists in database
            const { data: ensureData, error: ensureError } = await supabase.rpc('ensure_membership_for_current_user');
            
            if (ensureError) {
              console.error('❌ Failed to ensure user membership:', ensureError);
              throw new Error('Failed to create user profile');
            }
            
            if (ensureData && typeof ensureData === 'object' && ensureData !== null) {
              const ensureResult = ensureData as any;
              console.log('✅ User profile ensured:', ensureResult);
              
              if (ensureResult.role) {
                const companies: Company[] = ensureResult.company_id ? [{
                  id: ensureResult.company_id,
                  name: ensureResult.company_slug || 'Your Company',
                  slug: ensureResult.company_slug || 'company',
                  userRole: 'Member',
                  isAdmin: ensureResult.role === 'Admin'
                }] : [];
                
                resolve({ role: ensureResult.role, companies });
                return;
              }
            }
            
            throw new Error('No profile data found');
          }

          const profileData = data[0];
          const role = profileData.user_role;
          
          // Enhanced role validation
          if (!role || !['Admin', 'Client', 'Manager'].includes(role)) {
            console.error('❌ Invalid role returned from database:', role);
            
            // Try to use stored role as fallback
            const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
            if (storedRole && ['Admin', 'Client', 'Manager'].includes(storedRole)) {
              console.log('🔄 Using stored role as fallback:', storedRole);
              const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
              const companies = storedCompanies ? JSON.parse(storedCompanies) : [];
              resolve({ role: storedRole, companies });
              return;
            }
            
            throw new Error('Invalid role data');
          }
          
          // Parse companies from jsonb with better error handling
          let companiesData: Company[] = [];
          try {
            if (profileData.companies && Array.isArray(profileData.companies)) {
              companiesData = profileData.companies.map((company: any) => ({
                id: company.id || '',
                name: company.name || 'Unknown Company',
                slug: company.slug || 'unknown',
                userRole: company.userRole || 'Member',
                isAdmin: company.isAdmin || false
              })).filter(c => c.id); // Filter out invalid companies
            }
          } catch (parseError) {
            console.warn('⚠️ Error parsing companies data:', parseError);
            // Use empty array if parsing fails
          }

          console.log('✅ User profile loaded successfully:', { 
            role, 
            companiesCount: companiesData.length,
            companies: companiesData.map(c => ({ name: c.name, slug: c.slug }))
          });
          resolve({ role, companies: companiesData });
        } catch (error) {
          clearTimeout(profileTimeout);
          console.error(`❌ Failed to fetch user profile (attempt ${attempt}):`, error);
          
          // Enhanced retry logic with exponential backoff
          if (attempt < 3) {
            const retryDelay = Math.pow(2, attempt) * 1500; // 1.5s, 3s, 6s
            console.log(`⏳ Retrying profile fetch in ${retryDelay}ms...`);
            setTimeout(() => {
              fetchUserProfile(userId, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay);
          } else {
            // Final attempt failed - check for stored data
            const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
            const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
            
            if (storedRole && storedCompanies) {
              console.log('🔄 All attempts failed, using stored data as final fallback');
              try {
                resolve({ 
                  role: storedRole, 
                  companies: JSON.parse(storedCompanies) 
                });
              } catch (parseError) {
                reject(new Error('Failed to parse stored company data'));
              }
            } else {
              reject(error);
            }
          }
        }
      };

      fetchProfile();
    });
  }, []);

  // Enhanced auth state change handler with better preservation logic
  const handleAuthStateChange = useCallback((event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user, 'existing role:', userRole);

    if (newSession?.user) {
      // Set basic auth state immediately and synchronously
      setUser(newSession.user);
      setSession(newSession);
      setError(null);
      
      // Check if we have existing valid auth data from localStorage
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
      const hasValidStoredData = storedRole && storedCompanies;
      
      console.log('📦 Stored auth data check:', { 
        storedRole, 
        companiesCount: storedCompanies ? JSON.parse(storedCompanies).length : 0,
        hasValidStoredData 
      });
      
      // If we have valid stored data, use it immediately and clear loading
      if (hasValidStoredData) {
        console.log('⚡ Using stored auth data for instant restore');
        setUserRole(storedRole);
        setCompanies(JSON.parse(storedCompanies));
        setLoading(false);
        
        // Still fetch fresh profile data in background, but don't block UI
        setTimeout(() => {
          fetchUserProfile(newSession.user.id)
            .then(({ role, companies: companiesData }) => {
              console.log('🔄 Background profile refresh completed');
              if (role !== storedRole || companiesData.length !== JSON.parse(storedCompanies).length) {
                console.log('📊 Profile data changed, updating state');
                setUserRole(role);
                setCompanies(companiesData);
                persistAuthData(role, companiesData);
              }
              
              // Log login activity after successful auth
              const primaryCompany = companiesData.length > 0 ? companiesData[0] : null;
              activityLogger.logLogin(
                newSession.user.id,
                newSession.user.email || '',
                role,
                primaryCompany?.id,
                primaryCompany?.name
              ).catch(console.error);
            })
            .catch((error) => {
              console.warn('⚠️ Background profile refresh failed, keeping stored data:', error);
            });
        }, 100);
      } else {
        // No valid stored data - fetch fresh profile
        console.log('🔍 No valid stored data, fetching fresh profile...');
        // Keep loading true until profile is fetched to prevent premature rendering
        
        setTimeout(() => {
          performance.trackProfileFetch();
          fetchUserProfile(newSession.user.id)
            .then(({ role, companies: companiesData }) => {
              performance.trackProfileComplete();
              console.log('✅ Fresh profile loaded:', { role, companiesCount: companiesData.length });
              setUserRole(role);
              setCompanies(companiesData);
              persistAuthData(role, companiesData);
              setLoading(false); // Only set loading false AFTER userRole is set
              
              // Log login activity for fresh profile
              const primaryCompany = companiesData.length > 0 ? companiesData[0] : null;
              activityLogger.logLogin(
                newSession.user.id,
                newSession.user.email || '',
                role,
                primaryCompany?.id,
                primaryCompany?.name
              ).catch(console.error);
            })
            .catch((error) => {
              performance.trackProfileComplete();
              console.error('❌ Fresh profile fetch failed:', error);
              
              // Enhanced fallback with better state preservation
              const fallbackRole = storedRole || 'Client';
              const fallbackCompanies = storedCompanies ? JSON.parse(storedCompanies) : [];
              
              console.log('🔄 Using fallback data:', { fallbackRole, companiesCount: fallbackCompanies.length });
              setUserRole(fallbackRole);
              setCompanies(fallbackCompanies);
              setError('Profile data temporarily unavailable');
              setLoading(false); // Set loading false after fallback data is set
            });
        }, 0);
      }
    } else {
      // User signed out - synchronous cleanup
      console.log('🚪 User signed out, clearing all auth data');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setError(null);
      setLoading(false);
      clearAuthData();
    }
  }, [fetchUserProfile, userRole]);

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

  // Sign out with activity logging
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Log logout activity before clearing state
      if (user?.id && user?.email) {
        await activityLogger.logLogout(user.id, user.email);
      }
      
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

  // Enhanced auth initialization with session recovery
  useEffect(() => {
    console.log('🚀 Initializing auth...');
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        performance.trackAuthInit();
        
        // Set 15-second timeout to prevent infinite loading (increased for mobile)
        authTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth initialization timeout - checking for stored data');
            
            // Check if we have valid stored auth data to restore
            const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
            const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
            
            if (storedRole && storedCompanies) {
              console.log('🔄 Restoring from stored auth data due to timeout');
              setUserRole(storedRole);
              setCompanies(JSON.parse(storedCompanies));
              setError('Session restored from cache');
            } else {
              setError('Authentication took too long - please refresh');
            }
            setLoading(false);
          }
        }, 15000);

        // Set up auth listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Get current session with retry logic
        let session = null;
        let sessionAttempts = 0;
        const maxSessionAttempts = 3;
        
        while (!session && sessionAttempts < maxSessionAttempts && mounted) {
          try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.warn(`Session error (attempt ${sessionAttempts + 1}):`, error);
              if (sessionAttempts === maxSessionAttempts - 1) {
                throw error;
              }
            } else {
              session = currentSession;
            }
          } catch (error) {
            console.error(`Session fetch attempt ${sessionAttempts + 1} failed:`, error);
          }
          
          sessionAttempts++;
          if (!session && sessionAttempts < maxSessionAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * sessionAttempts)); // Exponential backoff
          }
        }
        
        if (!mounted) return () => subscription.unsubscribe();
        
        // Clear timeout since we got a response
        clearTimeout(authTimeout);
        
        if (session?.user) {
          console.log('✅ Found existing session for user:', session.user.email);
          performance.trackAuthComplete();
          handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          console.log('❌ No existing session found');
          performance.trackAuthComplete();
          
          // Check if we have orphaned stored data (user was logged in but session expired)
          const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
          if (storedRole) {
            console.log('🧹 Clearing orphaned auth data');
            clearAuthData();
          }
          
          setLoading(false);
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        if (mounted) {
          console.error('Auth init failed:', error);
          
          // Try to restore from localStorage on init failure
          const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
          const storedCompanies = localStorage.getItem(COMPANIES_STORAGE_KEY);
          
          if (storedRole && storedCompanies) {
            console.log('🔄 Attempting to restore from stored data after init failure');
            setUserRole(storedRole);
            setCompanies(JSON.parse(storedCompanies));
            setError('Session restored from cache - please refresh to verify');
          } else {
            setError('Failed to initialize authentication');
          }
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
  }, [handleAuthStateChange, performance]);

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