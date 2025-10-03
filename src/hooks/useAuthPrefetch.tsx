import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cacheManager';

interface AuthPrefetchOptions {
  enabled: boolean;
  userId: string | null;
  companyId: string | null;
}

/**
 * Prefetch critical data immediately after authentication
 * This dramatically improves perceived performance by loading data
 * before the user navigates to pages that need it
 */
export const useAuthPrefetch = ({ enabled, userId, companyId }: AuthPrefetchOptions) => {
  useEffect(() => {
    if (!enabled || !userId || !companyId) return;

    const prefetchData = async () => {
      try {
        // Prefetch portal content in parallel with other data
        const prefetchPromises = [
          // Portal content
          supabase.rpc('get_company_portal_content', { company_id_param: companyId }).then(result => {
            if (result.data?.[0]) {
              CacheManager.set(`portal_content_${companyId}`, result.data[0], 10 * 60 * 1000);
            }
          }),
          
          // Session data
          supabase.rpc('get_session_with_leader_info', { company_id_param: companyId }).then(result => {
            if (result.data) {
              CacheManager.set(`session_data_${companyId}`, result.data, 10 * 60 * 1000);
            }
          }),
          
          // User profile (if not already cached)
          supabase.rpc('get_user_profile', { p_user_id: userId }).then(result => {
            if (result.data?.[0]) {
              CacheManager.set(`user_profile_${userId}`, result.data[0], 15 * 60 * 1000);
            }
          })
        ];

        await Promise.allSettled(prefetchPromises);
        console.log('[prefetch] Critical data prefetched successfully');
      } catch (error) {
        console.warn('[prefetch] Prefetch failed (non-critical):', error);
      }
    };

    // Start prefetching after a tiny delay to not block initial render
    const timeoutId = setTimeout(prefetchData, 50);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, userId, companyId]);
};
