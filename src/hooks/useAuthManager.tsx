import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  companies: any[];
  loading: boolean;
  authReady: boolean;
  error: string | null;
}

interface AuthManager {
  state: AuthState;
  actions: {
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    clearError: () => void;
  };
}

/**
 * Centralized auth state manager for consistent authentication flow
 * Prevents double-click issues and race conditions
 */
export const useAuthManager = (): AuthManager => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    userRole: null,
    companies: [],
    loading: false,
    authReady: false,
    error: null,
  });

  // Prevent double-click submissions
  const operationInProgress = useRef(false);
  
  // Debounce auth operations to prevent rapid-fire requests
  const authOperationRef = useRef<NodeJS.Timeout>();

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (operationInProgress.current) {
      console.log('🔄 Auth operation already in progress, ignoring duplicate request');
      return { error: 'Authentication in progress' };
    }

    operationInProgress.current = true;
    updateState({ loading: true, error: null });

    try {
      console.log('🔐 Starting sign-in process...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign-in failed:', error);
        updateState({ loading: false, error: error.message });
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Sign-in successful, session established');
        // Don't update loading here - let the auth state change handler manage it
        return {};
      }

      return { error: 'No user data received' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      console.error('❌ Sign-in error:', error);
      updateState({ loading: false, error: message });
      return { error: message };
    } finally {
      // Clear operation lock after a brief delay to prevent race conditions
      setTimeout(() => {
        operationInProgress.current = false;
      }, 1000);
    }
  }, [updateState]);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    if (operationInProgress.current) {
      console.log('🔄 Auth operation already in progress, ignoring duplicate request');
      return { error: 'Authentication in progress' };
    }

    operationInProgress.current = true;
    updateState({ loading: true, error: null });

    try {
      console.log('📝 Starting sign-up process...');
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      if (error) {
        console.error('❌ Sign-up failed:', error);
        updateState({ loading: false, error: error.message });
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Sign-up successful');
        // Let auth state change handler manage the loading state
        return {};
      }

      return { error: 'No user data received' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      console.error('❌ Sign-up error:', error);
      updateState({ loading: false, error: message });
      return { error: message };
    } finally {
      setTimeout(() => {
        operationInProgress.current = false;
      }, 1000);
    }
  }, [updateState]);

  const signOut = useCallback(async () => {
    if (operationInProgress.current) return;
    
    operationInProgress.current = true;
    updateState({ loading: true });

    try {
      await supabase.auth.signOut();
      // State will be cleared by auth state change handler
    } catch (error) {
      console.error('❌ Sign-out error:', error);
      // Force clear state on error
      setState({
        user: null,
        session: null,
        userRole: null,
        companies: [],
        loading: false,
        authReady: false,
        error: 'Sign out failed'
      });
    } finally {
      operationInProgress.current = false;
    }
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  return {
    state,
    actions: {
      signIn,
      signUp,
      signOut,
      clearError
    }
  };
};