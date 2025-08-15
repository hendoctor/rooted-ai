import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface AuthCache {
  userRole: string | null;
  clientName: string | null;
  permissions: Record<string, boolean>;
  menuPermissions: any[];
}

class AuthCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ROLE_TTL = 30 * 60 * 1000; // 30 minutes for roles
  private readonly PERMISSION_TTL = 10 * 60 * 1000; // 10 minutes for permissions

  set<T>(key: string, data: T, customTtl?: number): void {
    const ttl = customTtl || this.DEFAULT_TTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Specific cache methods
  setUserRole(userId: string, role: string, clientName: string | null): void {
    this.set(`role:${userId}`, { role, clientName }, this.ROLE_TTL);
  }

  getUserRole(userId: string): { role: string; clientName: string | null } | null {
    return this.get(`role:${userId}`);
  }

  setPermission(userId: string, page: string, hasAccess: boolean): void {
    this.set(`permission:${userId}:${page}`, hasAccess, this.PERMISSION_TTL);
  }

  getPermission(userId: string, page: string): boolean | null {
    return this.get(`permission:${userId}:${page}`);
  }

  setMenuPermissions(userId: string, permissions: any[]): void {
    this.set(`menu:${userId}`, permissions, this.PERMISSION_TTL);
  }

  getMenuPermissions(userId: string): any[] | null {
    return this.get(`menu:${userId}`);
  }

  clearUserData(userId: string): void {
    this.invalidate(userId);
  }
}

export const authCache = new AuthCacheManager();

export const useAuthCache = () => {
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    size: 0
  });

  const updateStats = useCallback(() => {
    setCacheStats(prev => ({
      ...prev,
      size: authCache['cache'].size
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    cache: authCache,
    stats: cacheStats,
    clearCache: () => authCache.invalidate(),
  };
};