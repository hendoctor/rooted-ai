import { CacheManager } from './cacheManager';

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  lastModified?: string;
  maxAge?: number;
  staleWhileRevalidate?: number;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface CacheOptions {
  strategy?: CacheStrategy;
  ttl?: number;
  staleTime?: number;
  tags?: string[];
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

class EnhancedCacheClient {
  private store = new Map<string, CacheEntry<unknown>>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private activeRequests = new Map<string, Promise<any>>();
  private focusListener?: () => void;
  private reconnectListener?: () => void;

  constructor() {
    this.setupBrowserListeners();
  }

  private setupBrowserListeners() {
    // Revalidate on window focus
    this.focusListener = () => {
      this.store.forEach((entry, key) => {
        if (entry.staleWhileRevalidate && this.isStale(entry)) {
          this.backgroundRevalidate(key);
        }
      });
    };

    // Revalidate on network reconnection
    this.reconnectListener = () => {
      this.store.forEach((_, key) => {
        this.backgroundRevalidate(key);
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.focusListener);
      window.addEventListener('online', this.reconnectListener);
    }
  }

  private isStale(entry: CacheEntry<unknown>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (entry.maxAge && age > entry.maxAge * 1000) {
      return true;
    }
    
    if (entry.staleWhileRevalidate && age > entry.staleWhileRevalidate * 1000) {
      return true;
    }
    
    return false;
  }

  private async backgroundRevalidate(key: string) {
    // Implementation would go here - omitted for brevity
    console.log(`Background revalidating ${key}`);
  }

  async fetch<T>(
    key: string, 
    url: string, 
    config: RequestConfig = {},
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      strategy = 'stale-while-revalidate',
      ttl = 300000, // 5 minutes
      staleTime = 60000 // 1 minute
    } = options;

    // Check for existing active request
    const activeRequest = this.activeRequests.get(key);
    if (activeRequest && strategy !== 'network-only') {
      return activeRequest;
    }

    // Handle different cache strategies
    switch (strategy) {
      case 'cache-only':
        return this.getCachedData<T>(key) || Promise.reject(new Error('No cached data'));
      
      case 'cache-first':
        return this.cacheFirst<T>(key, url, config, ttl);
      
      case 'network-first':
        return this.networkFirst<T>(key, url, config, ttl);
      
      case 'network-only':
        return this.networkOnly<T>(key, url, config, ttl);
      
      case 'stale-while-revalidate':
      default:
        return this.staleWhileRevalidate<T>(key, url, config, ttl, staleTime);
    }
  }

  private getCachedData<T>(key: string): T | null {
    // Check unified cache first
    const unified = CacheManager.get<T>(key);
    if (unified) return unified;

    // Check local cache
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    return entry?.data || null;
  }

  private async cacheFirst<T>(key: string, url: string, config: RequestConfig, ttl: number): Promise<T> {
    const cached = this.getCachedData<T>(key);
    if (cached) {
      console.info(`[cache] hit ${key}`);
      return cached;
    }
    
    return this.networkFetch<T>(key, url, config, ttl);
  }

  private async networkFirst<T>(key: string, url: string, config: RequestConfig, ttl: number): Promise<T> {
    try {
      return await this.networkFetch<T>(key, url, config, ttl);
    } catch (error) {
      const cached = this.getCachedData<T>(key);
      if (cached) {
        console.warn(`[cache] network failed, using stale data for ${key}`);
        return cached;
      }
      throw error;
    }
  }

  private async networkOnly<T>(key: string, url: string, config: RequestConfig, ttl: number): Promise<T> {
    return this.networkFetch<T>(key, url, config, ttl);
  }

  private async staleWhileRevalidate<T>(
    key: string, 
    url: string, 
    config: RequestConfig, 
    ttl: number,
    staleTime: number
  ): Promise<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    // If we have fresh data, return it
    if (entry && (now - entry.timestamp) < staleTime) {
      console.info(`[cache] fresh hit ${key}`);
      return entry.data;
    }

    // If we have stale data, return it and revalidate in background
    if (entry) {
      console.info(`[cache] stale hit ${key}, revalidating`);
      // Don't await - revalidate in background
      this.networkFetch<T>(key, url, config, ttl).catch(() => {
        console.warn(`[cache] background revalidation failed for ${key}`);
      });
      return entry.data;
    }

    // No cached data, fetch from network
    return this.networkFetch<T>(key, url, config, ttl);
  }

  private async networkFetch<T>(
    key: string, 
    url: string, 
    config: RequestConfig,
    ttl: number
  ): Promise<T> {
    const {
      timeout = 10000,
      retries = 1,
      retryDelay = 1000,
      ...fetchConfig
    } = config;

    // Create a promise for this request
    const requestPromise = this.executeRequest<T>(key, url, fetchConfig, timeout, retries, retryDelay, ttl);
    this.activeRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.activeRequests.delete(key);
    }
  }

  private async executeRequest<T>(
    key: string,
    url: string,
    config: RequestInit,
    timeout: number,
    retries: number,
    retryDelay: number,
    ttl: number,
    attempt = 0
  ): Promise<T> {
    try {
      const entry = this.store.get(key) as CacheEntry<T> | undefined;
      const headers = new Headers(config.headers);
      
      // Add conditional request headers
      if (entry?.etag) {
        headers.set('If-None-Match', entry.etag);
      }
      if (entry?.lastModified) {
        headers.set('If-Modified-Since', entry.lastModified);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 304 Not Modified
      if (response.status === 304 && entry) {
        console.info(`[cache] 304 not modified ${key}`);
        entry.timestamp = Date.now();
        this.store.set(key, entry);
        return entry.data;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract cache headers
      const etag = response.headers.get('ETag') || undefined;
      const lastModified = response.headers.get('Last-Modified') || undefined;
      const cacheControl = response.headers.get('Cache-Control');
      
      let maxAge: number | undefined;
      let staleWhileRevalidate: number | undefined;
      
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        const svrMatch = cacheControl.match(/stale-while-revalidate=(\d+)/);
        
        if (maxAgeMatch) maxAge = parseInt(maxAgeMatch[1]);
        if (svrMatch) staleWhileRevalidate = parseInt(svrMatch[1]);
      }

      // Store in both caches
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        etag,
        lastModified,
        maxAge,
        staleWhileRevalidate
      };
      
      this.store.set(key, cacheEntry);
      CacheManager.set(key, data, ttl);
      
      console.info(`[cache] stored ${key}`);
      
      // Notify listeners
      this.notifyListeners(key, data);
      
      return data;
    } catch (error) {
      // Retry logic
      if (attempt < retries && !(error instanceof DOMException && error.name === 'AbortError')) {
        console.warn(`[cache] request failed for ${key}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.executeRequest<T>(key, url, config, timeout, retries, retryDelay, ttl, attempt + 1);
      }
      
      throw error;
    }
  }

  // Subscribe to cache updates
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private notifyListeners(key: string, data: any) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Cache listener error:', error);
        }
      });
    }
  }

  // Invalidate cache entries
  invalidate(keyOrPattern: string | RegExp) {
    if (typeof keyOrPattern === 'string') {
      this.store.delete(keyOrPattern);
      CacheManager.invalidate(keyOrPattern);
      console.info(`[cache] invalidated ${keyOrPattern}`);
    } else {
      // Pattern-based invalidation
      const keysToDelete: string[] = [];
      for (const key of this.store.keys()) {
        if (keyOrPattern.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        this.store.delete(key);
        CacheManager.invalidate(key);
      });
      
      console.info(`[cache] invalidated ${keysToDelete.length} keys matching pattern`);
    }
  }

  // Get cache statistics
  getStats() {
    const localSize = this.store.size;
    const unifiedStats = CacheManager.getStats();
    
    return {
      local: {
        size: localSize,
        keys: Array.from(this.store.keys())
      },
      unified: unifiedStats,
      activeRequests: this.activeRequests.size
    };
  }

  // Cleanup
  destroy() {
    if (typeof window !== 'undefined') {
      if (this.focusListener) {
        window.removeEventListener('focus', this.focusListener);
      }
      if (this.reconnectListener) {
        window.removeEventListener('online', this.reconnectListener);
      }
    }
    
    this.store.clear();
    this.listeners.clear();
    this.activeRequests.clear();
  }
}

export const enhancedCacheClient = new EnhancedCacheClient();
export { EnhancedCacheClient };