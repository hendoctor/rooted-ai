// Simplified Client Portal - best practices implementation
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import Header from '@/components/Header';
import AnnouncementCard from '@/components/client-portal/AnnouncementCard';
import ResourceCard from '@/components/client-portal/ResourceCard';
import UsefulLinkCard from '@/components/client-portal/UsefulLinkCard';
import CoachingCard from '@/components/client-portal/CoachingCard';
import KPITile from '@/components/client-portal/KPITile';
import EmptyState from '@/components/client-portal/EmptyState';
import AiToolCard from '@/components/client-portal/AiToolCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { activityLogger } from '@/utils/activityLogger';

const ClientPortal: React.FC = () => {
  const { user, userRole, companies, loading: authLoading } = useAuth();
  const { hasRoleForCompany, isMemberOfCompany } = usePermissions();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <AccessDenied />;
  }

  // If role is not yet resolved, keep showing a loading state (prevents AccessDenied flicker)
  if (!userRole) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // State
  const [company, setCompany] = useState<{ id: string; name?: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal data with loading state
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; date: string; summary?: string; content?: string; url?: string; status?: 'New' | 'Important'; }>>([]);
  const [resources, setResources] = useState<Array<{ id: string; title: string; type: 'Guide' | 'Video' | 'Slide'; href?: string }>>([]);
  const [usefulLinks, setUsefulLinks] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [nextSession, setNextSession] = useState<string | undefined>();
  const [kpis, setKpis] = useState<Array<{ name: string; value: string; target?: string }>>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [aiTools, setAiTools] = useState<Array<{ id: string; ai_tool: string; url?: string; comments?: string }>>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Initialize company and redirect if needed
  useEffect(() => {
    const initializeCompany = async () => {
      try {
        console.log('🏢 Initializing company:', { user: !!user, userRole, companiesCount: companies.length, slug });
        setLoading(true);
        setError(null);

        // Wait for auth to be ready
        if (!user || !userRole) {
          console.log('⏳ Waiting for auth to be ready...');
          return;
        }

        // If no slug provided, redirect to first company
        if (!slug && companies.length > 0) {
          console.log(`🔀 No slug, redirecting to first company: ${companies[0].slug}`);
          navigate(`/${companies[0].slug}`, { replace: true });
          return;
        }

        if (!slug) {
          setError('No company specified');
          setLoading(false);
          return;
        }

        // Find company from user's companies
        const userCompany = companies.find(c => c.slug === slug);
        
        if (userCompany) {
          console.log(`✅ Found user company: ${userCompany.name || userCompany.slug}`);
          setCompany(userCompany);
          
          // Log company access
          if (user?.id && user?.email) {
            activityLogger.logCompanyAccess(
              user.id,
              user.email,
              userCompany.id,
              userCompany.name || userCompany.slug
            ).catch(console.error);
          }
        } else if (userRole === 'Admin') {
          // Admin can access any company - fetch it
          console.log(`🔍 Admin accessing company by slug: ${slug}`);
          const { data, error } = await supabase
            .from('companies')
            .select('id, name, slug')
            .eq('slug', slug)
            .single();

          if (error) {
            console.error('Failed to fetch company:', error);
            setError('Company not found');
            setLoading(false);
            return;
          }

          console.log(`✅ Admin found company: ${data.name || data.slug}`);
          setCompany(data);
        } else {
          console.log('❌ Access denied to company:', slug);
          setError('Access denied to this company');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error initializing company:', err);
        setError('Failed to load company');
      } finally {
        setLoading(false);
      }
    };

    initializeCompany();
  }, [user, userRole, companies, slug, navigate]);

  // Enhanced portal data loading with better error handling and retry logic
  useEffect(() => {
    const loadPortalData = async () => {
      if (!company?.id || !user || !userRole) {
        console.log('📊 Skipping portal data load - missing requirements:', {
          companyId: company?.id,
          user: !!user,
          userRole
        });
        return;
      }

      console.log(`📊 Loading portal data for company: ${company.id} (${company.name || company.slug})`);
      setDataLoading(true);
      setDataError(null);

      try {
        // Keep existing data during refresh to avoid flicker

        // Load all portal data in parallel with retry logic
        const loadWithRetry = async (queryFn: () => Promise<any>, retries = 2): Promise<any> => {
          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              const result = await queryFn();
              return result;
            } catch (error) {
              console.warn(`Query attempt ${attempt + 1} failed:`, error);
              if (attempt === retries) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            }
          }
        };

        // Sequential, RLS-friendly loading using assignment tables first, then fetching records
        let loadedCount = 0;
        const totalSections = 7;
        let failCount = 0;

        const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

        // Announcements
        try {
          const { data: annMap, error: annMapErr } = await supabase
            .from('announcement_companies')
            .select('announcement_id')
            .eq('company_id', company.id);
          if (annMapErr) throw annMapErr;
          const ids = unique((annMap || []).map((r: any) => r.announcement_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('announcements')
              .select('id, title, summary, content, url, created_at')
              .in('id', ids)
              .order('created_at', { ascending: false });
            if (error) throw error;
            const formatted = (data || []).map((item: any) => ({
              id: item.id,
              title: item.title,
              date: new Date(item.created_at).toLocaleDateString(),
              summary: item.summary,
              content: item.content,
              url: item.url,
              status: 'New' as const,
            }));
            setAnnouncements(formatted);
          } else {
            setAnnouncements([]);
          }
          loadedCount++;
          console.log(`✅ Loaded announcements: ${ids.length}`);
        } catch (err) {
          console.error('❌ Announcements load error:', err);
          failCount++;
        }

        // Resources
        try {
          const { data: resMap, error: resMapErr } = await supabase
            .from('portal_resource_companies')
            .select('resource_id')
            .eq('company_id', company.id);
          if (resMapErr) throw resMapErr;
          const ids = unique((resMap || []).map((r: any) => r.resource_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('portal_resources')
              .select('id, title, description, link, category')
              .in('id', ids);
            if (error) throw error;
            const formatted = (data || []).map((item: any) => ({
              id: item.id,
              title: item.title,
              type: (item.category || 'Guide') as 'Guide' | 'Video' | 'Slide',
              href: item.link,
            }));
            setResources(formatted);
          } else {
            setResources([]);
          }
          loadedCount++;
          console.log(`✅ Loaded resources: ${ids.length}`);
        } catch (err) {
          console.error('❌ Resources load error:', err);
          failCount++;
        }

        // Useful links
        try {
          const { data: linkMap, error: linkMapErr } = await supabase
            .from('useful_link_companies')
            .select('link_id')
            .eq('company_id', company.id);
          if (linkMapErr) throw linkMapErr;
          const ids = unique((linkMap || []).map((r: any) => r.link_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('useful_links')
              .select('id, title, url, description')
              .in('id', ids);
            if (error) throw error;
            const formatted = (data || []).map((item: any) => ({ id: item.id, title: item.title, url: item.url }));
            setUsefulLinks(formatted);
          } else {
            setUsefulLinks([]);
          }
          loadedCount++;
          console.log(`✅ Loaded useful links: ${ids.length}`);
        } catch (err) {
          console.error('❌ Useful links load error:', err);
          failCount++;
        }

        // Coaching (next session)
        try {
          const { data: coachMap, error: coachMapErr } = await supabase
            .from('adoption_coaching_companies')
            .select('coaching_id')
            .eq('company_id', company.id);
          if (coachMapErr) throw coachMapErr;
          const ids = unique((coachMap || []).map((r: any) => r.coaching_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('adoption_coaching')
              .select('id, topic, description, steps, media, contact')
              .in('id', ids);
            if (error) throw error;
            const topic = Array.isArray(data) && data[0]?.topic ? data[0].topic : undefined;
            setNextSession(topic);
          } else {
            setNextSession(undefined);
          }
          loadedCount++;
          console.log(`✅ Loaded coaching sessions: ${ids.length}`);
        } catch (err) {
          console.error('❌ Coaching load error:', err);
          failCount++;
        }

        // Reports (KPIs)
        try {
          const { data: repMap, error: repMapErr } = await supabase
            .from('report_companies')
            .select('report_id')
            .eq('company_id', company.id);
          if (repMapErr) throw repMapErr;
          const ids = unique((repMap || []).map((r: any) => r.report_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('reports')
              .select('id, name, period, kpis, notes, link, created_at')
              .in('id', ids)
              .order('created_at', { ascending: false });
            if (error) throw error;
            const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;
            const kpiList = latest?.kpis && Array.isArray(latest.kpis) ? latest.kpis : [];
            setKpis(kpiList as Array<{ name: string; value: string; target?: string }>);
          } else {
            setKpis([]);
          }
          loadedCount++;
          console.log(`✅ Loaded reports: ${ids.length}`);
        } catch (err) {
          console.error('❌ Reports load error:', err);
          failCount++;
        }

        // FAQs
        try {
          const { data: faqMap, error: faqMapErr } = await supabase
            .from('faq_companies')
            .select('faq_id')
            .eq('company_id', company.id);
          if (faqMapErr) throw faqMapErr;
          const ids = unique((faqMap || []).map((r: any) => r.faq_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('faqs')
              .select('id, question, answer, category')
              .in('id', ids);
            if (error) throw error;
            setFaqs((data || []) as Array<{ id: string; question: string; answer: string }>);
          } else {
            setFaqs([]);
          }
          loadedCount++;
          console.log(`✅ Loaded FAQs: ${ids.length}`);
        } catch (err) {
          console.error('❌ FAQs load error:', err);
          failCount++;
        }

        // AI Tools
        try {
          const { data: toolsMap, error: toolsMapErr } = await supabase
            .from('ai_tool_companies')
            .select('ai_tool_id')
            .eq('company_id', company.id);
          if (toolsMapErr) throw toolsMapErr;
          const ids = unique((toolsMap || []).map((r: any) => r.ai_tool_id)).filter(Boolean);
          if (ids.length > 0) {
            const { data, error } = await supabase
              .from('ai_tools')
              .select('id, ai_tool, url, comments')
              .in('id', ids);
            if (error) throw error;
            setAiTools((data || []) as Array<{ id: string; ai_tool: string; url?: string; comments?: string }>);
          } else {
            setAiTools([]);
          }
          loadedCount++;
          console.log(`✅ Loaded AI tools: ${ids.length}`);
        } catch (err) {
          console.error('❌ AI tools load error:', err);
          failCount++;
        }

        console.log(`✅ Portal data load complete for ${company.name || company.slug}: ${loadedCount}/${totalSections} successful, ${failCount} failures`);

        // Log portal view activity (best-effort)
        if (user?.id && user?.email) {
          activityLogger.logPortalView(
            user.id,
            user.email,
            company.id,
            company.name || company.slug,
            []
          ).catch(console.error);
        }

        // Show toast only if there were failures
        if (failCount > 0) {
          toast.error(`Some content sections failed to load (${loadedCount}/${totalSections} loaded)`);
          setDataError(`Loaded ${loadedCount} of ${totalSections} sections. Some failed to load.`);
        }

      } catch (err) {
        console.error('❌ Critical error loading portal data:', err);
        toast.error('Failed to load portal content');
        setDataError('Failed to load portal content. Please refresh the page.');
      } finally {
        setDataLoading(false);
      }
    };

    loadPortalData();
  }, [company?.id]); // Only reload when company changes to prevent flicker

  // Check access - Any member can view the portal
  const hasAccess = company?.id && (userRole === 'Admin' || isMemberOfCompany(company.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return <AccessDenied />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="container mx-auto py-8">
          <EmptyState 
            message="You don't have access to any companies yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-20">
      <Header />

      <div className="container mx-auto py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to {company.name || company.slug}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your personalized portal for resources, updates, and tools.
          </p>
        </div>

        {/* KPI Dashboard */}
        {kpis.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Performance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, index) => (
                <KPITile
                  key={index}
                  label={kpi.name}
                  value={kpi.value}
                  target={kpi.target}
                />
              ))}
            </div>
          </div>
        )}

        {/* Next Session */}
        {nextSession && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Upcoming Session</h2>
            <CoachingCard 
              nextSession={nextSession}
            />
          </div>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Latest Updates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.slice(0, 4).map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  title={announcement.title}
                  date={announcement.date}
                  summary={announcement.summary}
                  status={announcement.status}
                  url={announcement.url}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  title={resource.title}
                  type={resource.type}
                  href={resource.href}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Tools */}
        {aiTools.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">AI Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiTools.map((tool) => (
                <AiToolCard
                  key={tool.id}
                  title={tool.ai_tool}
                  url={tool.url}
                  comments={tool.comments}
                />
              ))}
            </div>
          </div>
        )}

        {/* Useful Links */}
        {usefulLinks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usefulLinks.map((link) => (
                <UsefulLinkCard
                  key={link.id}
                  title={link.title}
                  url={link.url}
                />
              ))}
            </div>
          </div>
        )}

        {/* Company Settings Link for Admins */}
        {userRole === 'Admin' && (
          <div className="pt-8 border-t">
            <Link to={`/${company.slug}/settings`}>
              <Button variant="outline">
                Company Settings
              </Button>
            </Link>
          </div>
        )}

        {/* Data loading indicator */}
        {dataLoading && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading portal content...</p>
          </div>
        )}

        {/* Data error indicator */}
        {dataError && (
          <div className="text-center py-4">
            <p className="text-sm text-orange-600 dark:text-orange-400">{dataError}</p>
          </div>
        )}

        {/* Empty state if no content and not loading */}
        {!dataLoading && announcements.length === 0 && resources.length === 0 && usefulLinks.length === 0 && aiTools.length === 0 && !nextSession && kpis.length === 0 && (
          <EmptyState 
            message={dataError ? "Some content failed to load. Please refresh the page." : "Your portal content is being prepared. Check back soon!"}
          />
        )}
      </div>
    </div>
  );
};

export default ClientPortal;