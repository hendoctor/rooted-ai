import { cacheClient } from '@/lib/cacheClient';

interface MutationOptions {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidate?: string | string[];
}

export function useMutation<B = unknown, R = unknown>(options: MutationOptions = {}) {
  const { method = 'POST', invalidate } = options;

  const mutate = async (url: string, body?: B): Promise<R> => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(res.statusText);
    const data: R = await res.json();
    const keys = Array.isArray(invalidate) ? invalidate : invalidate ? [invalidate] : [];
    keys.forEach((k) => cacheClient.invalidate(k));
    return data;
  };

  return { mutate };
}
