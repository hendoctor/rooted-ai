import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthReliable';
import { Link, useSearchParams } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import Header from '@/components/Header';
import AnnouncementCard from '@/components/client-portal/AnnouncementCard';
import ResourceCard from '@/components/client-portal/ResourceCard';
import UsefulLinkCard from '@/components/client-portal/UsefulLinkCard';
import CoachingCard from '@/components/client-portal/CoachingCard';
import KPITile from '@/components/client-portal/KPITile';
import EmptyState from '@/components/client-portal/EmptyState';
import { supabase } from '@/integrations/supabase/client';

const ClientPortal: React.FC = () => {
  const { user, userRole, companies, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const companyParam = searchParams.get('company');

  // Default to the user's first company if no company is specified
  useEffect(() => {
    if (!companyParam && companies.length > 0) {
      setSearchParams({ company: companies[0].slug });
    }
  }, [companyParam, companies, setSearchParams]);

  const company = companyParam
    ? companies.find(c => c.slug === companyParam)
    : companies[0];
  const companySlug = company?.slug;

  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; date: string; status?: 'New' | 'Important'; }>>([]);
  const [resources, setResources] = useState<Array<{ id: string; title: string; type: 'Guide' | 'Video' | 'Slide'; href?: string }>>([]);
  const [usefulLinks, setUsefulLinks] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [nextSession, setNextSession] = useState<string | undefined>();
  const [kpis, setKpis] = useState<Array<{ name: string; value: string }>>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);

  useEffect(() => {
    if (!company?.id) return;
    const companyId = company.id;

    const loadData = async () => {
      console.log('Loading client portal content for company:', companyId);
      
      try {
        // Announcements
        const { data: annData, error: annError } = await supabase
          .from('announcement_companies')
          .select('announcement:announcements(id, title, created_at)')
          .eq('company_id', companyId)
          .order('announcement.created_at', { ascending: false });

        console.log('Announcements query result:', { data: annData, error: annError });

        if (!annError && annData) {
          setAnnouncements(
            annData
              .filter(a => a.announcement)
              .map(a => ({
                id: a.announcement.id,
                title: a.announcement.title || '',
                date: a.announcement.created_at
                  ? new Date(a.announcement.created_at).toLocaleDateString()
                  : '',
              }))
          );
        }

        // Resources
        const { data: resData, error: resError } = await supabase
          .from('portal_resource_companies')
          .select('resource:portal_resources(id, title, link, category)')
          .eq('company_id', companyId);

        console.log('Resources query result:', { data: resData, error: resError });

        if (!resError && resData) {
          setResources(
            resData
              .filter(r => r.resource)
              .map(r => ({
                id: r.resource.id,
                title: r.resource.title || '',
                type: (r.resource.category as 'Guide' | 'Video' | 'Slide') || 'Guide',
                href: r.resource.link || undefined,
              }))
          );
        }

        // Useful Links
        const { data: linkData, error: linkError } = await supabase
          .from('useful_link_companies')
          .select('link:useful_links(id, title, url)')
          .eq('company_id', companyId);

        console.log('Useful Links query result:', { data: linkData, error: linkError });

        if (!linkError && linkData) {
          setUsefulLinks(
            linkData
              .filter(l => l.link)
              .map(l => ({
                id: l.link.id,
                title: l.link.title || '',
                url: l.link.url || '',
              }))
          );
        }

        // Adoption Coaching
        const { data: coachingData, error: coachError } = await supabase
          .from('adoption_coaching_companies')
          .select('coaching:adoption_coaching(topic, created_at)')
          .eq('company_id', companyId)
          .order('coaching.created_at', { ascending: false })
          .limit(1);

        console.log('Coaching query result:', { data: coachingData, error: coachError });

        if (!coachError && coachingData && coachingData[0]?.coaching) {
          setNextSession(coachingData[0].coaching.topic || undefined);
        } else {
          setNextSession(undefined);
        }

        // Reports & KPIs
        const { data: reportData, error: reportError } = await supabase
          .from('report_companies')
          .select('report:reports(kpis, created_at)')
          .eq('company_id', companyId)
          .order('report.created_at', { ascending: false })
          .limit(1);

        console.log('Reports query result:', { data: reportData, error: reportError });

        if (!reportError && reportData && reportData[0]?.report) {
          const kpiData = reportData[0].report.kpis;
          if (Array.isArray(kpiData)) {
            setKpis(kpiData as Array<{ name: string; value: string }>);
          } else {
            setKpis([]);
          }
        } else {
          setKpis([]);
        }

        // FAQs
        const { data: faqData, error: faqError } = await supabase
          .from('faq_companies')
          .select('faq:faqs(id, question, answer)')
          .eq('company_id', companyId);

        console.log('FAQs query result:', { data: faqData, error: faqError });

        if (!faqError && faqData) {
          setFaqs(
            faqData
              .filter(f => f.faq)
              .map(f => ({
                id: f.faq.id,
                question: f.faq.question || '',
                answer: f.faq.answer || '',
              }))
          );
        }
      } catch (error) {
        console.error('Error loading client portal content:', error);
      }
    };

    loadData();
  }, [company?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }

  if (!user || (userRole !== 'Client' && userRole !== 'Admin')) {
    return <AccessDenied />;
  }

  if (!company) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-warm-beige">
      <Header />
      <div className="mt-16 flex-1 flex flex-col">
        <section className="bg-sage/10 text-center py-8">
          <h1 className="text-xl font-semibold text-forest-green">Your AI journey with RootedAI</h1>
          <p className="text-sm text-slate-gray mt-1">On track • Week 3 of Ability Building</p>
        </section>

        <main className="flex-1 container mx-auto px-4 py-10 space-y-8">
        {/* Company Settings Quick Access */}
        {companySlug && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-lg font-semibold text-forest-green">Company Settings</h3>
                <p className="text-sm text-slate-gray">Manage your company details and information</p>
              </div>
              <Link to={`/${companySlug}`}>
                <Button className="bg-forest-green hover:bg-forest-green/90 text-cream">
                  Edit Company Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Announcements */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Announcements</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {announcements.length ? (
                announcements.map(a => (
                  <AnnouncementCard key={a.id} title={a.title} date={a.date} status={a.status} />
                ))
              ) : (
                <EmptyState message="No announcements yet." />
              )}
            </CardContent>
            <div className="px-6 pb-4">
              <Button variant="outline" className="w-full text-forest-green">View all</Button>
            </div>
          </Card>

          {/* Training & Resources */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Training & Resources</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {resources.length ? (
                resources.map(r => (
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

          {/* Useful Links */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Useful Links</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {usefulLinks.length ? (
                usefulLinks.map(l => (
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

          {/* Adoption Coaching */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Adoption Coaching</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <CoachingCard nextSession={nextSession} />
            </CardContent>
            <div className="px-6 pb-4">
              <Button className="w-full bg-forest-green text-cream hover:bg-forest-green/90">
                Book a 30-min session
              </Button>
            </div>
          </Card>
        </div>

        {/* Secondary Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Reports & KPIs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {kpis.length ? (
                kpis.map((kpi, idx) => (
                  <KPITile key={idx} label={kpi.name} value={kpi.value} />
                ))
              ) : (
                <EmptyState message="No reports yet." />
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              {faqs.length ? (
                faqs.map(f => (
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

export default ClientPortal;
