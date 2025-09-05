import React, { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useProgressiveData } from '@/hooks/useProgressiveData';
import { usePrefetch } from '@/hooks/usePrefetch';
import { CardSkeleton, ClientPortalSkeleton } from '@/components/skeletons/CardSkeleton';
import AccessDenied from '@/pages/AccessDenied';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/lib/cacheManager';

// Lazy-loaded components for better performance
const AnnouncementCard = React.lazy(() => import('@/components/client-portal/AnnouncementCard'));
const ResourceCard = React.lazy(() => import('@/components/client-portal/ResourceCard'));
const UsefulLinkCard = React.lazy(() => import('@/components/client-portal/UsefulLinkCard'));
const CoachingCard = React.lazy(() => import('@/components/client-portal/CoachingCard'));
const KPITile = React.lazy(() => import('@/components/client-portal/KPITile'));
const EmptyState = React.lazy(() => import('@/components/client-portal/EmptyState'));
const AiToolCard = React.lazy(() => import('@/components/client-portal/AiToolCard'));

interface CompanyData {
  announcements: Array<{ id: string; title: string; date: string; summary?: string; content?: string; url?: string; status?: 'New' | 'Important' }>;
  resources: Array<{ id: string; title: string; type: 'Guide' | 'Video' | 'Slide'; href?: string }>;
  usefulLinks: Array<{ id: string; title: string; url: string }>;
  nextSession?: string;
  kpis: Array<{ name: string; value: string; target?: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  aiTools: Array<{ id: string; ai_tool: string; url?: string; comments?: string }>;
}

const OptimizedClientPortal: React.FC = () => {
  const { user, userRole, companies, loading } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Initialize prefetching
  usePrefetch({
    routes: [`/${slug}`, `/${slug}/settings`],
    companyData: true,
    userContext: true,
    delay: 50
  });

  // Default to the user's first company if no slug is specified or slug is invalid
  useEffect(() => {
    if (!slug && companies.length > 0) {
      navigate(`/${companies[0].slug}`, { replace: true });
    }
  }, [slug, companies, navigate]);

  const company = slug
    ? companies.find(c => c.slug === slug)
    : companies[0];

  // Fallback resolver: fetch companies directly if context hasn't populated yet
  const [resolvedCompany, setResolvedCompany] = useState<{ id: string; name?: string; slug: string } | undefined>();
  
  useEffect(() => {
    if (user && slug && (!company || companies.length === 0)) {
      (async () => {
        try {
          const { data } = await supabase.rpc('get_user_companies');
          if (Array.isArray(data)) {
            const match = (data as any[]).find(c => c.company_slug === slug);
            if (match) {
              setResolvedCompany({ id: match.company_id, name: match.company_name, slug: match.company_slug });
            } else if (data[0]) {
              navigate(`/${(data as any[])[0].company_slug}`, { replace: true });
            }
          }
        } catch (e) {
          console.warn('Failed to resolve company from RPC:', e);
        }
      })();
    }
  }, [user, slug, company, companies, navigate]);

  const activeCompany = company || resolvedCompany;

  // Progressive data loading with caching
  const { 
    data: companyData, 
    isLoading: isDataLoading, 
    isStale,
    error: dataError 
  } = useProgressiveData<CompanyData>({
    cacheKey: `company_portal_${activeCompany?.id}`,
    fetcher: async () => {
      if (!activeCompany?.id) throw new Error('No active company');
      
      const companyId = activeCompany.id;
      
      // Check if data is already cached
      const cached = CacheManager.get<CompanyData>(`company_data_${companyId}`);
      if (cached) return cached;

      console.log('Loading optimized company portal data for:', companyId);

      // Batch all requests in parallel for better performance
      const [
        announcementsResult,
        resourcesResult,
        usefulLinksResult,
        coachingResult,
        reportsResult,
        faqsResult,
        aiToolsResult
      ] = await Promise.allSettled([
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

      // Process results
      const announcements = announcementsResult.status === 'fulfilled' && announcementsResult.value.data
        ? announcementsResult.value.data.map(a => ({
            id: a.id,
            title: a.title || '',
            date: a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
            summary: a.summary || '',
            content: a.content || '',
            url: a.url || '',
          }))
        : [];

      const resources = resourcesResult.status === 'fulfilled' && resourcesResult.value.data
        ? resourcesResult.value.data.map(r => ({
            id: r.id,
            title: r.title || '',
            type: (r.category as 'Guide' | 'Video' | 'Slide') || 'Guide',
            href: r.link || undefined,
          }))
        : [];

      const usefulLinks = usefulLinksResult.status === 'fulfilled' && usefulLinksResult.value.data
        ? usefulLinksResult.value.data.map(l => ({
            id: l.id,
            title: l.title || '',
            url: l.url || '',
          }))
        : [];

      const nextSession = coachingResult.status === 'fulfilled' && 
        coachingResult.value.data && 
        coachingResult.value.data[0] 
        ? coachingResult.value.data[0].topic 
        : undefined;

      const kpis = reportsResult.status === 'fulfilled' && 
        reportsResult.value.data && 
        reportsResult.value.data[0] && 
        Array.isArray(reportsResult.value.data[0].kpis)
        ? reportsResult.value.data[0].kpis as Array<{ name: string; value: string; target?: string }>
        : [];

      const faqs = faqsResult.status === 'fulfilled' && faqsResult.value.data
        ? faqsResult.value.data.map(f => ({
            id: f.id,
            question: f.question || '',
            answer: f.answer || '',
          }))
        : [];

      const aiTools = aiToolsResult.status === 'fulfilled' && aiToolsResult.value.data
        ? aiToolsResult.value.data.map(t => ({
            id: t.id,
            ai_tool: t.ai_tool || '',
            url: t.url || '',
            comments: t.comments || '',
          }))
        : [];

      const result = {
        announcements,
        resources,
        usefulLinks,
        nextSession,
        kpis,
        faqs,
        aiTools
      };

      // Cache the processed data
      CacheManager.set(`company_data_${companyId}`, result, 600000); // 10 minutes
      
      return result;
    },
    enabled: !!activeCompany?.id,
    staleTime: 300000, // 5 minutes
    onSuccess: (data) => {
      console.log('Company portal data loaded successfully:', data);
    },
    onError: (error) => {
      console.error('Failed to load company portal data:', error);
    }
  });

  // Show auth loading state
  if (loading) {
    return <ClientPortalSkeleton />;
  }

  // Check permissions
  if (!user || (userRole !== 'Client' && userRole !== 'Admin')) {
    return <AccessDenied />;
  }

  // Show company resolution loading
  if (!activeCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing your company portal...</p>
        </div>
      </div>
    );
  }

  // Show data loading skeleton if no cached data
  if (isDataLoading && !companyData) {
    return <ClientPortalSkeleton />;
  }

  // Show error state if no data and error occurred
  if (dataError && !companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="text-destructive text-lg font-medium">
            Failed to load company data
          </div>
          <p className="text-muted-foreground text-sm">
            {dataError.message}
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const data = companyData || {
    announcements: [],
    resources: [],
    usefulLinks: [],
    kpis: [],
    faqs: [],
    aiTools: []
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-beige">
      <Header />
      
      {/* Stale data indicator */}
      {isStale && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-center py-2 text-sm">
          Showing cached data. Updates are being loaded in the background.
        </div>
      )}
      
      <div className="mt-16 flex-1 flex flex-col">
        <section className="bg-sage/10 text-center py-8">
          <h1 className="text-xl font-semibold text-forest-green">Your AI journey with RootedAI</h1>
          <p className="text-sm text-slate-gray mt-1">On track • Week 3 of Ability Building</p>
        </section>

        <main className="flex-1 container mx-auto px-4 py-10 space-y-8">
          {/* Company Settings Quick Access */}
          {activeCompany.slug && (
            <Card className="mb-6">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="text-lg font-semibold text-forest-green">Company Settings</h3>
                  <p className="text-sm text-slate-gray">Manage your company details and information</p>
                </div>
                <Link to={`/${activeCompany.slug}/settings`}>
                  <Button className="bg-forest-green hover:bg-forest-green/90 text-cream">
                    Edit Company Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Announcements */}
            <Suspense fallback={<CardSkeleton showFooter contentRows={2} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">Announcements</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {data.announcements.length ? (
                    data.announcements.map(a => (
                      <AnnouncementCard
                        key={a.id}
                        title={a.title}
                        date={a.date}
                        status={a.status}
                        summary={a.summary}
                        content={a.content}
                        url={a.url}
                      />
                    ))
                  ) : (
                    <EmptyState message="No announcements yet." />
                  )}
                </CardContent>
                <div className="px-6 pb-4">
                  <Button variant="outline" className="w-full text-forest-green">View all</Button>
                </div>
              </Card>
            </Suspense>

            {/* Training & Resources */}
            <Suspense fallback={<CardSkeleton showFooter contentRows={3} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">Training & Resources</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {data.resources.length ? (
                    data.resources.map(r => (
                      <ResourceCard key={r.id} title={r.title} type={r.type} href={r.href} />
                    ))
                  ) : (
                    <EmptyState message="Your first training pack arrives after kickoff." />
                  )}
                </CardContent>
                <div className="px-6 pb-4">
                  <Button variant="outline" className="w-full text-forest-green">Start training</Button>
                </div>
              </Card>
            </Suspense>

            {/* Useful Links */}
            <Suspense fallback={<CardSkeleton showFooter contentRows={2} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">Useful Links</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {data.usefulLinks.length ? (
                    data.usefulLinks.map(l => (
                      <UsefulLinkCard key={l.id} title={l.title} url={l.url} />
                    ))
                  ) : (
                    <EmptyState message="No useful links yet." />
                  )}
                </CardContent>
                <div className="px-6 pb-4">
                  <Button variant="outline" className="w-full text-forest-green">View all</Button>
                </div>
              </Card>
            </Suspense>

            {/* Adoption Coaching */}
            <Suspense fallback={<CardSkeleton showFooter contentRows={1} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">Adoption Coaching</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CoachingCard nextSession={data.nextSession} />
                </CardContent>
                <div className="px-6 pb-4">
                  <Button className="w-full bg-forest-green text-cream hover:bg-forest-green/90">
                    Book a 30-min session
                  </Button>
                </div>
              </Card>
            </Suspense>
          </div>

          {/* Secondary Row */}
          <div className="grid gap-6 md:grid-cols-3">
            <Suspense fallback={<CardSkeleton contentRows={4} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">Reports & KPIs</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {data.kpis.length ? (
                    data.kpis.map((kpi, idx) => (
                      <KPITile key={idx} label={kpi.name} value={kpi.value} target={kpi.target} />
                    ))
                  ) : (
                    <EmptyState message="No reports yet." />
                  )}
                </CardContent>
              </Card>
            </Suspense>

            <Suspense fallback={<CardSkeleton contentRows={3} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">FAQ</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.faqs.length ? (
                    data.faqs.map(f => (
                      <div key={f.id} className="mb-4 last:mb-0">
                        <p className="text-sm font-medium text-forest-green">{f.question}</p>
                        <p className="text-sm text-slate-gray">{f.answer}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Short answers coming soon." />
                  )}
                </CardContent>
              </Card>
            </Suspense>

            <Suspense fallback={<CardSkeleton contentRows={3} />}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-forest-green">AI Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.aiTools.length ? (
                    data.aiTools.map(t => (
                      <AiToolCard 
                        key={t.id} 
                        title={t.ai_tool} 
                        url={t.url} 
                        comments={t.comments} 
                      />
                    ))
                  ) : (
                    <EmptyState message="No AI tools available yet." />
                  )}
                </CardContent>
              </Card>
            </Suspense>
          </div>
        </main>

        <footer className="bg-slate-gray text-cream text-center py-6 mt-10">
          <p>Local Kansas City Experts • Microsoft-built solutions</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="mailto:support@rootedai.com" className="underline">Email Support</a>
            <a href="#" className="underline">Schedule Discovery</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OptimizedClientPortal;