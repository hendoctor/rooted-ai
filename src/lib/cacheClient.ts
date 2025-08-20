export type Strategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

interface CacheEntry<T> {
  data: T;
  expiry: number;
  etag?: string;
}

class CacheClient {
  private store = new Map<string, CacheEntry<unknown>>();

  async fetch<T>(key: string, url: string, options: RequestInit = {}, strategy: Strategy = 'cache-first', ttl = 60000): Promise<T> {
    const entry = this.store.get(key);
    const now = Date.now();
    const isExpired = entry ? now > entry.expiry : true;

    if (strategy === 'cache-first') {
      if (entry && !isExpired) {
        console.info(`[cache] hit ${key}`);
        return entry.data as T;
      }
      return this.networkFetch<T>(key, url, options, ttl);
    }

    if (strategy === 'network-first') {
      try {
        return await this.networkFetch<T>(key, url, options, ttl);
      } catch (err) {
        if (entry && !isExpired) {
          console.warn(`[cache] network error, using cache for ${key}`);
          return entry.data as T;
        }
        throw err;
      }
    }

    // stale-while-revalidate
    if (entry && !isExpired) {
      this.networkFetch<T>(key, url, options, ttl).catch(() => {
        /* background refresh failure */
      });
      console.info(`[cache] stale hit ${key}`);
      return entry.data as T;
    }

    return this.networkFetch<T>(key, url, options, ttl);
  }

  private async networkFetch<T>(key: string, url: string, options: RequestInit, ttl: number): Promise<T> {
    const entry = this.store.get(key);
    const headers = new Headers(options.headers);
    if (entry?.etag) headers.set('If-None-Match', entry.etag);

    const res = await fetch(url, { ...options, headers });
    if (res.status === 304 && entry) {
      console.info(`[cache] revalidated ${key}`);
      entry.expiry = Date.now() + ttl;
      this.store.set(key, entry);
      return entry.data as T;
    }
    if (!res.ok) throw new Error(res.statusText);

    const data = await res.json();
    const etag = res.headers.get('ETag') || undefined;
    this.store.set(key, { data, expiry: Date.now() + ttl, etag });
    console.info(`[cache] updated ${key}`);
    return data;
  }

  invalidate(key?: string) {
    if (key) {
      this.store.delete(key);
      console.info(`[cache] invalidated ${key}`);
    } else {
      this.store.clear();
      console.info('[cache] cleared');
    }
  }
}

export const cacheClient = new CacheClient();

export const clearAllCaches = () => cacheClient.invalidate();
