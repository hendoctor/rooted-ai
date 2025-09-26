import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortalContent {
  announcements: any[];
  resources: any[];
  useful_links: any[];
  ai_tools: any[];
  faqs: any[];
  coaching: any[];
  kpis: any[];
}

interface UsePublicPortalContentReturn {
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

export const usePublicPortalContent = (): UsePublicPortalContentReturn => {
  const [content, setContent] = useState<PortalContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch Client Demo portal content using the public function
      const { data, error: fetchError } = await supabase.rpc('get_client_demo_portal_content');

      if (fetchError) {
        throw fetchError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Normalize the content structure
      const normalizedContent: PortalContent = {
        announcements: data?.announcements || [],
        resources: data?.resources || [],
        useful_links: data?.useful_links || [],
        ai_tools: data?.ai_tools || [],
        faqs: data?.faqs || [],
        coaching: data?.coaching || [],
        kpis: data?.kpis || []
      };

      setContent(normalizedContent);
      setError(null);
    } catch (err) {
      console.error('Public portal content fetch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load demo content';
      setError(errorMessage);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    fetchContent(true);
  }, [fetchContent]);

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