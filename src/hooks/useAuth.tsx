import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<'profiles'> | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUserRole: (role: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error) {
      setProfile(data);
    } else {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserRole = async (userId: string, userEmail: string, retryCount: number = 0) => {
    try {
      console.log('Fetching role for user:', userEmail, 'retry:', retryCount);
      
      // Try using email lookup (most reliable for current schema)
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role')
        .eq('email', userEmail)
        .maybeSingle();

      if (!emailError && emailData) {
        console.log('Role fetched by email:', emailData.role);
        setUserRole(emailData.role);
        return;
      }

      // If role fetch failed and we haven't retried, attempt once more
      if (retryCount === 0) {
        console.log('First attempt failed, retrying...');
        setTimeout(() => fetchUserRole(userId, userEmail, 1), 2000);
        return;
      }

      console.log('Role fetch failed after retry, checking current state');
      
      // Don't reset to Public if we already have an Admin role (preserve admin access)
      if (userRole !== 'Admin') {
        console.log('Setting role to Public as fallback');
        setUserRole('Public');
      } else {
        console.log('Preserving existing admin role');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      // Don't reset admin role on error
      if (!userRole || userRole === 'Public') {
        setUserRole('Public');
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          setTimeout(() => fetchUserRole(session.user.id, session.user.email || ''), 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        setTimeout(() => fetchUserRole(session.user.id, session.user.email || ''), 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signOut,
    setUserRole,
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