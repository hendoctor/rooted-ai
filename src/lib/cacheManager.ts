// Unified cache management with deployment-aware versioning
import { del } from 'idb-keyval';

interface CacheEntry<T> {
  data: T;
  expiry: number;
  version: string;
  userId?: string;
}

class CacheManagerClass {
  private store = new Map<string, CacheEntry<unknown>>();
  private currentVersion = '1.0.0'; // Will be updated from package.json or build
  private currentUserId: string | null = null;

  // Set current app version (call this on app init)
  setVersion(version: string) {
    this.currentVersion = version;
    this.validateCacheVersion();
  }

  // Set current user (call this when user changes)
  setCurrentUser(userId: string | null) {
    if (this.currentUserId !== userId) {
      this.clearUserData();
      this.currentUserId = userId;
    }
  }

  // Store data with version and user context
  set<T>(key: string, data: T, ttl = 300000): void { // 5 minutes default
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttl,
      version: this.currentVersion,
      userId: this.currentUserId || undefined
    };
    
    this.store.set(key, entry);
    console.log(`[cache] set ${key} (ttl: ${ttl}ms)`);
  }

  // Get data with validation
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      console.log(`[cache] expired ${key}`);
      return null;
    }

    // Check version
    if (entry.version !== this.currentVersion) {
      this.store.delete(key);
      console.log(`[cache] version mismatch ${key}`);
      return null;
    }

    // Check user context
    if (entry.userId && entry.userId !== this.currentUserId) {
      this.store.delete(key);
      console.log(`[cache] user mismatch ${key}`);
      return null;
    }

    console.log(`[cache] hit ${key}`);
    return entry.data;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Remove specific key
  invalidate(key: string): void {
    this.store.delete(key);
    console.log(`[cache] invalidated ${key}`);
  }

  // Clear user-specific data
  clearUserData(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if ((entry as CacheEntry<unknown>).userId) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.store.delete(key));
    console.log(`[cache] cleared user data (${keysToDelete.length} items)`);
  }

  // Clear all cache
  clearAll(): void {
    this.store.clear();
    // Also clear IndexedDB auth cache
    this.clearIndexedDBCache();
    console.log('[cache] cleared all');
  }

  // Clear caches that don't match current version
  private validateCacheVersion(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if ((entry as CacheEntry<unknown>).version !== this.currentVersion) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.store.delete(key));
    if (keysToDelete.length > 0) {
      console.log(`[cache] cleared ${keysToDelete.length} outdated items`);
    }
  }

  // Clear IndexedDB caches used by auth
  private async clearIndexedDBCache(): Promise<void> {
    try {
      await del('auth_session_cache');
      console.log('[cache] cleared IndexedDB auth cache');
    } catch (error) {
      console.warn('Failed to clear IndexedDB cache:', error);
    }
  }

  // Get cache stats
  getStats(): { size: number; userItems: number; expiredItems: number } {
    let userItems = 0;
    let expiredItems = 0;
    const now = Date.now();
    
    for (const [, entry] of this.store.entries()) {
      const cacheEntry = entry as CacheEntry<unknown>;
      if (cacheEntry.userId) userItems++;
      if (now > cacheEntry.expiry) expiredItems++;
    }
    
    return {
      size: this.store.size,
      userItems,
      expiredItems
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const keysToDelete: string[] = [];
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (now > (entry as CacheEntry<unknown>).expiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.store.delete(key));
    if (keysToDelete.length > 0) {
      console.log(`[cache] cleaned up ${keysToDelete.length} expired items`);
    }
  }
}

export const CacheManager = new CacheManagerClass();

// Auto cleanup every 5 minutes
setInterval(() => {
  CacheManager.cleanup();
}, 5 * 60 * 1000);

// Legacy compatibility exports
export const clearAllCaches = () => CacheManager.clearAll();