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

const ClientPortal: React.FC = () => {
  const { user, userRole, companies } = useAuth();
  const { hasRoleForCompany, isMemberOfCompany } = usePermissions();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // State
  const [company, setCompany] = useState<{ id: string; name?: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal data
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; date: string; summary?: string; content?: string; url?: string; status?: 'New' | 'Important'; }>>([]);
  const [resources, setResources] = useState<Array<{ id: string; title: string; type: 'Guide' | 'Video' | 'Slide'; href?: string }>>([]);
  const [usefulLinks, setUsefulLinks] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [nextSession, setNextSession] = useState<string | undefined>();
  const [kpis, setKpis] = useState<Array<{ name: string; value: string; target?: string }>>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [aiTools, setAiTools] = useState<Array<{ id: string; ai_tool: string; url?: string; comments?: string }>>([]);

  // Initialize company and redirect if needed
  useEffect(() => {
    const initializeCompany = async () => {
      try {
        setLoading(true);
        setError(null);

        // If no slug provided, redirect to first company
        if (!slug && companies.length > 0) {
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
          setCompany(userCompany);
        } else if (userRole === 'Admin') {
          // Admin can access any company - fetch it
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

          setCompany(data);
        } else {
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

    if (user && userRole) {
      initializeCompany();
    }
  }, [user, userRole, companies, slug, navigate]);

  // Load portal data when company is available
  useEffect(() => {
    const loadPortalData = async () => {
      if (!company?.id) return;

      console.log(`📊 Loading portal data for company: ${company.id}`);

      try {
        // Load all portal data in parallel
        const [
          announcementsResult,
          resourcesResult,
          linksResult,
          coachingResult,
          reportsResult,
          faqsResult,
          aiToolsResult
        ] = await Promise.allSettled([
          supabase
            .from('announcements')
            .select(`
              id, title, summary, content, url, created_at,
              announcement_companies!inner(company_id)
            `)
            .eq('announcement_companies.company_id', company.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('portal_resources')
            .select(`
              id, title, description, link, category,
              portal_resource_companies!inner(company_id)
            `)
            .eq('portal_resource_companies.company_id', company.id),

          supabase
            .from('useful_links')
            .select(`
              id, title, url, description,
              useful_link_companies!inner(company_id)
            `)
            .eq('useful_link_companies.company_id', company.id),

          supabase
            .from('adoption_coaching')
            .select(`
              id, topic, description, steps, media, contact,
              adoption_coaching_companies!inner(company_id)
            `)
            .eq('adoption_coaching_companies.company_id', company.id),

          supabase
            .from('reports')
            .select(`
              id, name, period, kpis, notes, link,
              report_companies!inner(company_id)
            `)
            .eq('report_companies.company_id', company.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('faqs')
            .select(`
              id, question, answer, category,
              faq_companies!inner(company_id)
            `)
            .eq('faq_companies.company_id', company.id),

          supabase
            .from('ai_tools')
            .select(`
              id, ai_tool, url, comments,
              ai_tool_companies!inner(company_id)
            `)
            .eq('ai_tool_companies.company_id', company.id)
        ]);

        // Process announcements
        if (announcementsResult.status === 'fulfilled' && announcementsResult.value.data) {
          const formattedAnnouncements = announcementsResult.value.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            date: new Date(item.created_at).toLocaleDateString(),
            summary: item.summary,
            content: item.content,
            url: item.url,
            status: 'New' as const
          }));
          setAnnouncements(formattedAnnouncements);
        }

        // Process resources
        if (resourcesResult.status === 'fulfilled' && resourcesResult.value.data) {
          const formattedResources = resourcesResult.value.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            type: item.category || 'Guide' as 'Guide' | 'Video' | 'Slide',
            href: item.link
          }));
          setResources(formattedResources);
        }

        // Process useful links
        if (linksResult.status === 'fulfilled' && linksResult.value.data) {
          const formattedLinks = linksResult.value.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            url: item.url
          }));
          setUsefulLinks(formattedLinks);
        }

        // Process coaching (next session)
        if (coachingResult.status === 'fulfilled' && coachingResult.value.data && coachingResult.value.data.length > 0) {
          const coaching = coachingResult.value.data[0];
          setNextSession(coaching.topic);
        }

        // Process reports (KPIs)
        if (reportsResult.status === 'fulfilled' && reportsResult.value.data && reportsResult.value.data.length > 0) {
          const latestReport = reportsResult.value.data[0];
          if (latestReport.kpis && Array.isArray(latestReport.kpis)) {
            setKpis(latestReport.kpis as Array<{ name: string; value: string; target?: string }>);
          }
        }

        // Process FAQs
        if (faqsResult.status === 'fulfilled' && faqsResult.value.data) {
          setFaqs(faqsResult.value.data);
        }

        // Process AI Tools
        if (aiToolsResult.status === 'fulfilled' && aiToolsResult.value.data) {
          setAiTools(aiToolsResult.value.data);
        }

        console.log(`✅ Portal data loaded successfully for ${company.name || company.slug}`);
      } catch (err) {
        console.error('Error loading portal data:', err);
        toast.error('Failed to load some portal data');
      }
    };

    loadPortalData();
  }, [company?.id]);

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

        {/* Empty state if no content */}
        {announcements.length === 0 && resources.length === 0 && usefulLinks.length === 0 && aiTools.length === 0 && !nextSession && kpis.length === 0 && (
          <EmptyState 
            message="Your portal content is being prepared. Check back soon!"
          />
        )}
      </div>
    </div>
  );
};

export default ClientPortal;