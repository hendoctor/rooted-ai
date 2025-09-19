import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cacheManager';

interface PortalContent {
  announcements: any[];
  resources: any[];
  useful_links: any[];
  ai_tools: any[];
  faqs: any[];
  coaching: any[];
  kpis: any[];
}

interface UsePortalContentOptions {
  companyId: string | null;
  enabled?: boolean;
}

interface UsePortalContentReturn {
  content: PortalContent;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY_CONTENT: PortalContent = {
  announcements: [],
  resources: [],
  useful_links: [],
  ai_tools: [],
  faqs: [],
  coaching: [],
  kpis: []
};

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const usePortalContent = ({ 
  companyId, 
  enabled = true 
}: UsePortalContentOptions): UsePortalContentReturn => {
  const [content, setContent] = useState<PortalContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (showLoading = true) => {
    if (!companyId || !enabled) return;

    const cacheKey = `portal_content_${companyId}`;
    
    try {
      // Check cache first
      const cached = CacheManager.get<PortalContent>(cacheKey);
      if (cached) {
        setContent(cached);
        setError(null);
        
        // Background refresh if cache is getting stale
        const cacheStats = CacheManager.getStats();
        if (showLoading) {
          setLoading(false);
        }
        
        // Skip background refresh for now to prevent unnecessary API calls
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch enhanced session data along with other content
      const [contentResult, sessionsResult] = await Promise.all([
        supabase.rpc('get_company_portal_content', { company_id_param: companyId }),
        supabase.rpc('get_session_with_leader_info', { company_id_param: companyId })
      ]);

      if (contentResult.error) {
        throw contentResult.error;
      }

      // The function returns a single row with columns, so we need the first item
      const parsedContent = contentResult.data?.[0] as any;
      const sessionData = sessionsResult.data || [];
      
      if (parsedContent?.error) {
        throw new Error(parsedContent.error);
      }

      // Normalize the content structure with enhanced coaching data
      const normalizedContent: PortalContent = {
        announcements: parsedContent?.announcements || [],
        resources: parsedContent?.resources || [],
        useful_links: parsedContent?.useful_links || [],
        ai_tools: parsedContent?.ai_tools || [],
        faqs: parsedContent?.faqs || [],
        coaching: sessionData.length > 0 ? sessionData : (parsedContent?.coaching || []),
        kpis: parsedContent?.kpis || []
      };

      // Cache the results
      CacheManager.set(cacheKey, normalizedContent, CACHE_TTL);
      
      setContent(normalizedContent);
      setError(null);
    } catch (err) {
      console.error('Portal content fetch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load portal content';
      setError(errorMessage);
      
      // Don't clear existing content on error, just show error state
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [companyId, enabled]);

  const refresh = useCallback(() => {
    if (companyId) {
      // Clear cache and refetch
      const cacheKey = `portal_content_${companyId}`;
      CacheManager.invalidate(cacheKey);
      fetchContent(true);
    }
  }, [companyId, fetchContent]);

  useEffect(() => {
    fetchContent(true);
  }, [fetchContent]);

  return {
    content,
    loading,
    error,
    refresh
  };
};