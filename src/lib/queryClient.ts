import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { supabase } from '@/integrations/supabase/client';

export const CACHE_SCHEMA_VERSION = 'v1';

// Create a persistent QueryClient with sane defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      placeholderData: (previous) => previous,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: localforage,
});

persistQueryClient({
  queryClient,
  persister,
});

// Clear cache on sign out to avoid data leakage
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    queryClient.clear();
    persister.removeClient?.();
  }
});
