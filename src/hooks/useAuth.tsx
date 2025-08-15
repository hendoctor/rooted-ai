import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Tables<'profiles'> | null;
  userRole: string | null;
  clientName: string | null;
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
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoadingRef, setRoleLoadingRef] = useState<{ current: boolean }>({ current: false });

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
    // Prevent concurrent role fetches
    if (roleLoadingRef.current) {
      console.log('🔄 Role fetch already in progress, skipping');
      return;
    }
    
    roleLoadingRef.current = true;
    
    try {
      console.log('🔍 Fetching role for user:', userEmail, 'retry:', retryCount, 'current role:', userRole);
      
      // Try using email lookup (most reliable for current schema)
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role, client_name')
        .eq('email', userEmail)
        .maybeSingle();

      console.log('📊 Database query result:', { emailData, emailError });

      if (!emailError && emailData) {
        console.log('✅ Role and client fetched successfully:', emailData.role, emailData.client_name);
        setUserRole(emailData.role);
        setClientName(emailData.client_name);
        return;
      }

      // If email lookup failed, try auth_user_id lookup as backup
      const { data: idData, error: idError } = await supabase
        .from('users')
        .select('role, client_name')
        .eq('auth_user_id', userId)
        .maybeSingle();

      console.log('📊 Auth ID query result:', { idData, idError });

      if (!idError && idData) {
        console.log('✅ Role and client fetched by auth_user_id:', idData.role, idData.client_name);
        setUserRole(idData.role);
        setClientName(idData.client_name);
        return;
      }

      // If both failed and we haven't retried, attempt once more
      if (retryCount === 0) {
        console.log('⏰ First attempt failed, retrying in 2 seconds...');
        setTimeout(() => fetchUserRole(userId, userEmail, 1), 2000);
        return;
      }

      console.error('❌ Role fetch failed after retry. Email error:', emailError, 'ID error:', idError);
      
      // Only set to Client if we don't already have a role stored
      if (!userRole) {
        console.log('⚠️ Setting role to Client as fallback (no existing role)');
        setUserRole('Client');
      } else {
        console.log('🛡️ Preserving existing role:', userRole);
      }
    } catch (error) {
      console.error('💥 Error in fetchUserRole:', error);
      // Preserve existing role on error
      if (!userRole) {
        console.log('⚠️ Setting role to Client due to error (no existing role)');
        setUserRole('Client');
      } else {
        console.log('🛡️ Preserving existing role on error:', userRole);
      }
    } finally {
      roleLoadingRef.current = false;
    }
  };

  useEffect(() => {
    console.log('🚀 Auth useEffect triggered');
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed:', event, 'user:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('👤 User logged in, fetching profile and role');
          fetchProfile(session.user.id);
          setTimeout(() => fetchUserRole(session.user.id, session.user.email || ''), 0);
        } else {
          console.log('👋 User logged out, clearing profile and role');
          setProfile(null);
          setUserRole(null);
          setClientName(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Checking existing session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('📋 Existing session found, fetching profile and role');
        fetchProfile(session.user.id);
        setTimeout(() => fetchUserRole(session.user.id, session.user.email || ''), 0);
      }
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🚪 Signing out user');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error);
        throw error;
      } else {
        console.log('✅ Successfully signed out');
        // Clear all state immediately
        setUserRole(null);
        setClientName(null);
        setProfile(null);
        setUser(null);
        setSession(null);
        // Clear role backup from localStorage
        localStorage.removeItem('user_role_backup');
        console.log('🧹 Cleared all auth state and localStorage backup');
      }
    } catch (error) {
      console.error('💥 Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    clientName,
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