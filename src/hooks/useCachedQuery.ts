import { useEffect, useState } from 'react';
import { cacheClient, Strategy } from '@/lib/cacheClient';

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
    cacheClient.fetch<T>(key, url, {}, strategy, ttl)
      .then(setData)
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
