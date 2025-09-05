import { useEffect, useState } from 'react';
import { cacheClient, Strategy } from '@/lib/cacheClient';
import { CacheManager } from '@/lib/cacheManager';

interface Options {
  strategy?: Strategy;
  ttl?: number;
  enabled?: boolean;
}

export function useCachedQuery<T = unknown>(key: string, url: string, options: Options = {}) {
  const { strategy = 'cache-first', ttl = 60000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = () => {
    setLoading(true);
    
    // Check unified cache first
    const cached = CacheManager.get<T>(key);
    if (cached && strategy === 'cache-first') {
      setData(cached);
      setLoading(false);
      return;
    }
    
    cacheClient.fetch<T>(key, url, {}, strategy, ttl)
      .then((result) => {
        setData(result);
        // Store in unified cache too
        CacheManager.set(key, result, ttl);
      })
      .catch((err) => setError(err as Error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, url, strategy, ttl, enabled]);

  return { data, loading, error, refetch: fetchData };
}
