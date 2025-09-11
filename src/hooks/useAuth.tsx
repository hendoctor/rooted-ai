// Simplified and reliable authentication hook - best practices implementation
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user profile data
  const fetchUserProfile = useCallback(async (userId: string): Promise<{ role: string; companies: Company[] }> => {
    if (!userId) {
      console.warn('No userId provided to fetchUserProfile');
      return { role: 'Client', companies: [] };
    }

    console.log('👤 Fetching user profile for:', userId);

    try {
      const { data, error } = await supabase.rpc('get_user_profile', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No user profile data returned');
        return { role: 'Client', companies: [] };
      }

      const profileData = data[0];
      const role = profileData.user_role || 'Client';
      
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
      return { role, companies: companiesData };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }, []);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log('🔄 Auth state change:', event, !!newSession?.user);

    if (newSession?.user) {
      // Set basic auth state immediately
      setUser(newSession.user);
      setSession(newSession);
      setError(null);

      // Fetch user profile data
      try {
        const { role, companies: companiesData } = await fetchUserProfile(newSession.user.id);
        setUserRole(role);
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error loading user profile during auth change:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    } else {
      // User signed out
      console.log('🚪 User signed out');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setCompanies([]);
      setError(null);
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Refresh auth data
  const refreshAuth = useCallback(async () => {
    if (!user?.id) {
      console.warn('No user ID available for refresh');
      return;
    }

    console.log('🔄 Refreshing auth data...');
    setError(null);

    try {
      const { role, companies: companiesData } = await fetchUserProfile(user.id);
      setUserRole(role);
      setCompanies(companiesData);
      console.log('✅ Auth data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setError('Failed to refresh authentication');
    }
  }, [user?.id, fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);
      await supabase.auth.signOut();
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

  // Initialize auth
  useEffect(() => {
    console.log('🚀 Initializing auth...');

    const initAuth = async () => {
      try {
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
          await handleAuthStateChange('INITIAL_SESSION', session);
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