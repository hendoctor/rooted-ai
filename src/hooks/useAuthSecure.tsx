import { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
  error: string | null;
  signOut: () => Promise<void>;
  setUserRole: (role: string | null) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure role persistence with proper encryption
const STORAGE_KEY = 'auth_state_secure';
const BACKUP_EXPIRY_MINUTES = 30; // Reduced expiry time

// Generate encryption key
let encryptionKey: CryptoKey | null = null;

const getEncryptionKey = async (): Promise<CryptoKey> => {
  if (!encryptionKey) {
    encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  return encryptionKey;
};

const encryptData = async (data: string): Promise<string> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

const decryptData = async (encryptedData: string): Promise<string> => {
  const key = await getEncryptionKey();
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
};

const saveRoleBackup = async (email: string, role: string, clientName: string | null) => {
  if (role !== 'Admin') return; // Only backup Admin roles for security
  
  try {
    const backup = {
      email,
      role,
      clientName,
      timestamp: Date.now(),
      integrity: crypto.getRandomValues(new Uint8Array(16)).join('')
    };
    
    const encrypted = await encryptData(JSON.stringify(backup));
    sessionStorage.setItem(STORAGE_KEY, encrypted); // Use sessionStorage for better security
  } catch (error) {
    console.warn('Secure role backup failed:', error);
  }
};

const loadRoleBackup = async (email: string): Promise<{ role: string; clientName: string | null } | null> => {
  try {
    const encrypted = sessionStorage.getItem(STORAGE_KEY);
    if (!encrypted) return null;
    
    const decrypted = await decryptData(encrypted);
    const backup = JSON.parse(decrypted);
    
    if (!backup || backup.email !== email) return null;
    
    // Check expiry (reduced to 30 minutes)
    const minutesSince = (Date.now() - backup.timestamp) / (1000 * 60);
    if (minutesSince > BACKUP_EXPIRY_MINUTES) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Only return Admin roles
    if (backup.role !== 'Admin') return null;
    
    return {
      role: backup.role,
      clientName: backup.clientName
    };
  } catch (error) {
    console.warn('Secure role backup load failed:', error);
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const clearRoleBackup = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    encryptionKey = null; // Clear encryption key
  } catch (error) {
    console.warn('Role backup clear failed:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authSubscription, setAuthSubscription] = useState<any>(null);

  // Optimized role fetching with database functions
  const fetchUserRole = useCallback(async (userEmail: string, userId: string) => {
    if (!userEmail) {
      console.warn('No email provided for role fetch');
      return { role: 'Client', clientName: null };
    }

    try {
      console.log('🔍 Fetching role for user:', userEmail);
      
      // Use the optimized database function
      const { data, error } = await supabase.rpc('get_user_role_secure', {
        user_email: userEmail
      });

      console.log('📊 Role fetch result:', { data, error });

      if (error) {
        console.warn('Primary role fetch failed, trying backup method:', error);
        
        // Backup method using auth_user_id
        const { data: backupData, error: backupError } = await supabase.rpc('get_user_role_by_auth_id', {
          auth_user_id: userId
        });
        
        console.log('📊 Backup role fetch result:', { backupData, backupError });
        
        if (backupError || !backupData) {
          console.error('Both role fetch methods failed:', { error, backupError });
          return { role: 'Client', clientName: null };
        }
        
        const result = { 
          role: (backupData as any)?.role || 'Client', 
          clientName: (backupData as any)?.client_name || null 
        };
        console.log('✅ Using backup role result:', result);
        return result;
      }

      if (!data) {
        console.warn('No role data found for user:', userEmail);
        return { role: 'Client', clientName: null };
      }

      const result = { 
        role: (data as any)?.role || 'Client', 
        clientName: (data as any)?.client_name || null 
      };
      console.log('✅ Final role result:', result);
      return result;
    } catch (error) {
      console.error('Role fetch error:', error);
      return { role: 'Client', clientName: null };
    }
  }, []);

  // Optimized profile fetching
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      } else if (error) {
        console.warn('Profile fetch error (non-critical):', error);
      }
    } catch (error) {
      console.warn('Profile fetch failed (non-critical):', error);
    }
  }, []);

  // Comprehensive auth state handler
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
        setError('Invalid user session - no email');
        setUserRole('Client');
        setClientName(null);
        setLoading(false);
        return;
      }

      try {
        // Check for backup role first (for Admin persistence)
        const backup = await loadRoleBackup(userEmail);
        if (backup && backup.role === 'Admin') {
          console.log('🔄 Restoring Admin role from secure backup');
          setUserRole(backup.role);
          setClientName(backup.clientName);
        }

        // Fetch current role and profile in parallel
        const [roleResult] = await Promise.all([
          fetchUserRole(userEmail, userId),
          fetchProfile(userId)
        ]);

        // Update role if different from backup or if no backup
        if (!backup || roleResult.role !== backup.role) {
          console.log('✅ Setting role:', roleResult.role, 'client:', roleResult.clientName);
          console.log('📊 Role result details:', JSON.stringify(roleResult, null, 2));
          setUserRole(roleResult.role);
          setClientName(roleResult.clientName);
          
          // Save backup for Admin roles
          if (roleResult.role === 'Admin') {
            console.log('💾 Saving Admin role backup for persistence');
            await saveRoleBackup(userEmail, roleResult.role, roleResult.clientName);
          }
        } else {
          console.log('📋 Using cached role from backup:', backup.role);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setError('Failed to load user data');
        // Preserve existing role on error if available
        if (!userRole) {
          setUserRole('Client');
        }
      }
    } else {
      // User logged out
      console.log('👋 User logged out - clearing state');
      setProfile(null);
      setUserRole(null);
      setClientName(null);
      clearRoleBackup();
    }

    setLoading(false);
  }, [fetchUserRole, fetchProfile, userRole]);

  // Initialize auth system
  useEffect(() => {
    if (initialized) return;

    console.log('🚀 Initializing secure auth system');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    setAuthSubscription(subscription);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session check error:', error);
        setError('Session validation failed');
        setLoading(false);
        return;
      }

      console.log('🔍 Initial session check:', session?.user?.email || 'no session');
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    setInitialized(true);

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [initialized, handleAuthStateChange]);

  // Refresh auth data
  const refreshAuth = useCallback(async () => {
    if (!user?.email) return;
    
    console.log('🔄 Refreshing auth data for:', user.email);
    setLoading(true);
    
    try {
      const roleResult = await fetchUserRole(user.email, user.id);
      setUserRole(roleResult.role);
      setClientName(roleResult.clientName);
      
      if (roleResult.role === 'Admin') {
        await saveRoleBackup(user.email, roleResult.role, roleResult.clientName);
      }
      
      await fetchProfile(user.id);
    } catch (error) {
      console.error('Auth refresh error:', error);
      setError('Failed to refresh user data');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserRole, fetchProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    console.log('🚪 Signing out user');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      // Clear all state
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setClientName(null);
      setError(null);
      clearRoleBackup();
      
      console.log('✅ Successfully signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
      setError('Sign out failed');
      throw error;
    } finally {
      setLoading(false);
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