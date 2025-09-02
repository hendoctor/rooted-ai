// Centralized authentication guard with redirect logic
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { get, set, del } from 'idb-keyval';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface RedirectConfig {
  requireAuth?: boolean;
  authOnlyPages?: string[];
  protectedRoutes?: string[];
  defaultRedirect?: string;
}

export class AuthGuard {
  private static config: RedirectConfig = {
    requireAuth: true,
    authOnlyPages: ['/auth'],
    protectedRoutes: ['/admin', '/profile', '/client'],
    defaultRedirect: '/'
  };

  // Check if current route needs authentication
  static isProtectedRoute(pathname: string): boolean {
    return this.config.protectedRoutes?.some(route => 
      pathname.startsWith(route)
    ) ?? false;
  }

  // Check if route is auth-only (redirect authenticated users away)
  static isAuthOnlyRoute(pathname: string): boolean {
    return this.config.authOnlyPages?.includes(pathname) ?? false;
  }

  // Get redirect URL based on auth state and current route
  static getRedirectUrl(
    authState: AuthState,
    currentPath: string,
    searchParams?: URLSearchParams
  ): string | null {
    const { user, loading } = authState;
    
    // Don't redirect while loading
    if (loading) return null;

    // If no session and on protected route → redirect to login
    if (!user && this.isProtectedRoute(currentPath)) {
      const redirectUrl = new URL('/auth', window.location.origin);
      redirectUrl.searchParams.set('next', currentPath);
      return redirectUrl.pathname + redirectUrl.search;
    }

    // If has session and on auth-only route → redirect to next or default
    if (user && this.isAuthOnlyRoute(currentPath)) {
      const nextUrl = searchParams?.get('next');
      
      // Validate and sanitize redirect URL
      if (nextUrl && this.isValidRedirect(nextUrl)) {
        return nextUrl;
      }
      
      return this.config.defaultRedirect || '/';
    }

    return null;
  }

  // Validate redirect URLs to prevent open redirects
  static isValidRedirect(url: string): boolean {
    try {
      // Only allow relative URLs or same origin
      if (url.startsWith('/')) {
        return true;
      }
      
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  // Get fresh session with proper error handling
  static async getSession(): Promise<AuthState> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session validation error:', error);
        return { user: null, session: null, loading: false };
      }

      return {
        user: session?.user ?? null,
        session,
        loading: false
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return { user: null, session: null, loading: false };
    }
  }

  // Sign out with proper cleanup
  static async signOut(): Promise<void> {
    try {
      // Clear only our own cache, not Supabase's storage
      await AuthCache.clearSession();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Navigate to home
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Force logout anyway
      window.location.href = '/';
    }
  }
}

// Improved cache management for auth state
export class AuthCache {
  private static readonly SESSION_KEY = 'auth_session_cache';
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  static async setSession(session: Session | null): Promise<void> {
    try {
      if (!session) {
        await this.clearSession();
        return;
      }

      const cacheData = {
        session,
        timestamp: Date.now(),
      };
      await set(this.SESSION_KEY, cacheData);
    } catch (error) {
      console.warn('Failed to cache session:', error);
    }
  }

  static async getSession(): Promise<Session | null> {
    try {
      const cached = await get<{ session: Session; timestamp: number }>(this.SESSION_KEY);
      if (!cached) return null;

      const { session, timestamp } = cached;

      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.warn('Failed to read cached session:', error);
      return null;
    }
  }

  static async clearSession(): Promise<void> {
    try {
      await del(this.SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear session cache:', error);
    }
  }
}