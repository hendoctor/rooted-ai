import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PrefetchOptions {
  routes?: string[];
  companyData?: boolean;
  userContext?: boolean;
  delay?: number;
}

export function usePrefetch({
  routes = [],
  companyData = true,
  userContext = true,
  delay = 100
}: PrefetchOptions = {}) {
  const { user, companies, userRole } = useAuth();
  const location = useLocation();
  const prefetchedRef = useRef(new Set<string>());

  // Prefetch user-specific data
  const prefetchUserData = useCallback(async () => {
    if (!user?.id || !userRole) return;

    try {
      await supabase.rpc('get_user_profile', {
        p_user_id: user.id
      });
    } catch (error) {
      console.warn('Prefetch user profile failed:', error);
    }
  }, [user?.id, userRole]);

  // Prefetch company-specific data
  const prefetchCompanyData = useCallback(async (companyId: string) => {
    const cacheKey = `company_data_${companyId}`;
    
    // Skip if already prefetched in this session
    if (prefetchedRef.current.has(cacheKey)) return;
    prefetchedRef.current.add(cacheKey);

    try {
      // Prefetch multiple company-related data in parallel
      await Promise.allSettled([
        supabase
          .from('announcements')
          .select('id, title, summary, content, url, created_at, announcement_companies!inner(company_id)')
          .eq('announcement_companies.company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('portal_resources')
          .select('id, title, link, category, portal_resource_companies!inner(company_id)')
          .eq('portal_resource_companies.company_id', companyId)
          .limit(10),
        
        supabase
          .from('useful_links')
          .select('id, title, url, useful_link_companies!inner(company_id)')
          .eq('useful_link_companies.company_id', companyId)
          .limit(10),
        
        supabase
          .from('adoption_coaching')
          .select('topic, adoption_coaching_companies!inner(company_id)')
          .eq('adoption_coaching_companies.company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('reports')
          .select('kpis, report_companies!inner(company_id)')
          .eq('report_companies.company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('faqs')
          .select('id, question, answer, faq_companies!inner(company_id)')
          .eq('faq_companies.company_id', companyId)
          .limit(10),
        
        supabase
          .from('ai_tools')
          .select('id, ai_tool, url, comments, ai_tool_companies!inner(company_id)')
          .eq('ai_tool_companies.company_id', companyId)
          .limit(10)
      ]);
    } catch (error) {
      console.warn('Prefetch company data failed:', error);
    }
  }, []);

  // Prefetch route components (code splitting)
  const prefetchRoute = useCallback(async (route: string) => {
    const routeKey = `route_${route}`;
    
    if (prefetchedRef.current.has(routeKey)) return;
    prefetchedRef.current.add(routeKey);

    try {
      // Dynamic import for route components
      switch (route) {
        case '/admin':
          await import('@/pages/AdminDashboard');
          break;
        case '/profile':
          await import('@/pages/Profile');
          break;
        default:
          if (route.includes('/settings')) {
            await import('@/pages/CompanyPage');
          } else if (route.match(/^\/[^\/]+$/)) {
            await import('@/pages/ClientPortal');
          }
      }
    } catch (error) {
      console.warn(`Prefetch route ${route} failed:`, error);
    }
  }, []);

  // Smart prefetching based on user role and navigation patterns
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(async () => {
      // Prefetch user context if enabled
      if (userContext) {
        await prefetchUserData();
      }

      // Prefetch accessible routes
      const accessibleRoutes = ['/profile'];
      if (userRole === 'Admin') {
        accessibleRoutes.push('/admin');
      }
      
      // Add company routes
      companies.forEach(company => {
        accessibleRoutes.push(`/${company.slug}`);
        accessibleRoutes.push(`/${company.slug}/settings`);
      });

      // Prefetch route components
      for (const route of [...routes, ...accessibleRoutes]) {
        if (route !== location.pathname) {
          await prefetchRoute(route);
        }
      }

      // Prefetch company data for current and likely next companies
      if (companyData && companies.length > 0) {
        const currentCompany = companies.find(c => 
          location.pathname.includes(c.slug)
        ) || companies[0];
        
        if (currentCompany) {
          await prefetchCompanyData(currentCompany.id);
        }
        
        // Prefetch data for other companies the user has access to
        const otherCompanies = companies.filter(c => c.id !== currentCompany?.id);
        for (const company of otherCompanies.slice(0, 2)) { // Limit to 2 additional companies
          await prefetchCompanyData(company.id);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [user, userRole, companies, location.pathname, delay, prefetchUserData, prefetchCompanyData, prefetchRoute, routes, companyData, userContext]);

  return {
    prefetchRoute,
    prefetchCompanyData,
    prefetchUserData
  };
}

// Hook for intersection-based prefetching
export function useIntersectionPrefetch() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observeElement = useCallback((element: HTMLElement, callback: () => void) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              callback();
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '100px' } // Start prefetching 100px before element enters viewport
      );
    }

    observerRef.current.observe(element);
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { observeElement };
}