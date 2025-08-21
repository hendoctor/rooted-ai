import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthReliable';
import { Link, useSearchParams } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import Header from '@/components/Header';
import AnnouncementCard from '@/components/client-portal/AnnouncementCard';
import ResourceCard from '@/components/client-portal/ResourceCard';
import InsightCard from '@/components/client-portal/InsightCard';
import CoachingCard from '@/components/client-portal/CoachingCard';
import KPITile from '@/components/client-portal/KPITile';
import EmptyState from '@/components/client-portal/EmptyState';

const ClientPortal: React.FC = () => {
  const { user, userRole, companies, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const companyParam = searchParams.get('company');
  const company = companyParam
    ? companies.find(c => c.slug === companyParam)
    : companies[0];
  const companySlug = company?.slug;

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

  const announcements: Array<{ id: number; title: string; date: string; status?: 'New' | 'Important'; }> = [];
  const resources: Array<{ id: number; title: string; type: 'Guide' | 'Video' | 'Slide'; href?: string; }> = [];
  const insights: Array<{ id: number; summary: string; timestamp: string; }> = [];
  const nextSession: string | undefined = undefined;

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

          {/* Agent Insights */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">Agent Insights</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {insights.length ? (
                insights.map(i => (
                  <InsightCard key={i.id} summary={i.summary} timestamp={i.timestamp} />
                ))
              ) : (
                <EmptyState message="Agent summaries appear once your agent is live." />
              )}
            </CardContent>
            <div className="px-6 pb-4">
              <Button variant="outline" className="w-full text-forest-green">View details</Button>
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
              <KPITile label="Hours saved" value="0h" />
              <KPITile label="Completion" value="0%" />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-forest-green">FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState message="Short answers coming soon." />
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
