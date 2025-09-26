import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortalContent {
  announcements: any[];
  resources: any[];
  useful_links: any[];
  ai_tools: any[];
  apps: any[];
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
  apps: [],
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

      // The function returns an array with a single row containing the columns
      const contentRow = data?.[0];
      
      if (!contentRow) {
        throw new Error('No demo content available');
      }

      // Normalize the content structure from the row data
      const normalizedContent: PortalContent = {
        announcements: Array.isArray(contentRow.announcements) ? contentRow.announcements : [],
        resources: Array.isArray(contentRow.resources) ? contentRow.resources : [],
        useful_links: Array.isArray(contentRow.useful_links) ? contentRow.useful_links : [],
        ai_tools: Array.isArray(contentRow.ai_tools) ? contentRow.ai_tools : [],
        apps: Array.isArray(contentRow.apps) ? contentRow.apps : [],
        faqs: Array.isArray(contentRow.faqs) ? contentRow.faqs : [],
        coaching: Array.isArray(contentRow.coaching) ? contentRow.coaching : [],
        kpis: Array.isArray(contentRow.kpis) ? contentRow.kpis : []
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