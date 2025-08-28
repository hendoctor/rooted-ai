import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_SCHEMA_VERSION } from '@/lib/queryClient';

interface UseTableParams<T> {
  table: string;
  role: string;
  userId?: string | null;
  companyIds?: string[];
  select?: string;
  filters?: Record<string, any>;
  enabled?: boolean;
}

export function useTable<T = any>({
  table,
  role,
  userId,
  companyIds = [],
  select = '*',
  filters = {},
  enabled = true,
}: UseTableParams<T>) {
  const key = [
    CACHE_SCHEMA_VERSION,
    table,
    role,
    userId || 'anon',
    [...companyIds].sort(),
    filters,
  ];

  const queryFn = async (): Promise<T[]> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      let query = supabase.from(table).select(select).signal(controller.signal);
      if (filters && Object.keys(filters).length > 0) {
        query = query.match(filters);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    } finally {
      clearTimeout(timeout);
    }
  };

  const query = useQuery<T[]>({
    queryKey: key,
    queryFn,
    enabled,
    placeholderData: keepPreviousData,
  });

  const showCachedHint = !!query.error && !!query.data;

  return { ...query, showCachedHint };
}
