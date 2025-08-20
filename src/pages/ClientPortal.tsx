import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthReliable';
import { Link, useSearchParams } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import Header from '@/components/Header';
import AnnouncementCard from '@/components/client-portal/AnnouncementCard';
import ResourceCard from '@/components/client-portal/ResourceCard';
import InsightCard from '@/components/client-portal/InsightCard';
import KPITile from '@/components/client-portal/KPITile';
import EmptyState from '@/components/client-portal/EmptyState';
import {
  AnnouncementForm,
  ResourceForm,
  InsightForm,
  CoachingForm,
  ReportForm,
  FAQForm,
  Announcement,
  Resource,
  Insight,
  Coaching,
  Report,
  FAQ,
} from '@/components/admin/WidgetForms';

const ClientPortal: React.FC = () => {
  const { user, userRole, companies, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const companyParam = searchParams.get('company');
  const company = companyParam
    ? companies.find(c => c.slug === companyParam)
    : companies[0];
  const companySlug = company?.slug;

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [coachings, setCoachings] = React.useState<Coaching[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);

  const [announcementOpen, setAnnouncementOpen] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | undefined>(undefined);

  const [resourceOpen, setResourceOpen] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<Resource | undefined>(undefined);

  const [insightOpen, setInsightOpen] = React.useState(false);
  const [editingInsight, setEditingInsight] = React.useState<Insight | undefined>(undefined);

  const [coachingOpen, setCoachingOpen] = React.useState(false);
  const [editingCoaching, setEditingCoaching] = React.useState<Coaching | undefined>(undefined);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [editingReport, setEditingReport] = React.useState<Report | undefined>(undefined);

  const [faqOpen, setFaqOpen] = React.useState(false);
  const [editingFaq, setEditingFaq] = React.useState<FAQ | undefined>(undefined);

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

  const saveAnnouncement = (data: Announcement) => {
    setAnnouncements(prev => {
      if (data.id != null) {
        return prev.map(a => (a.id === data.id ? data : a));
      }
      const id = prev.length ? Math.max(...prev.map(a => a.id || 0)) + 1 : 1;
      return [...prev, { ...data, id, date: new Date().toLocaleDateString() }];
    });
  };

  const deleteAnnouncement = (id: number) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const saveResource = (data: Resource) => {
    setResources(prev => {
      if (data.id != null) {
        return prev.map(r => (r.id === data.id ? data : r));
      }
      const id = prev.length ? Math.max(...prev.map(r => r.id || 0)) + 1 : 1;
      return [...prev, { ...data, id }];
    });
  };

  const deleteResource = (id: number) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const saveInsight = (data: Insight) => {
    setInsights(prev => {
      if (data.id != null) {
        return prev.map(i => (i.id === data.id ? data : i));
      }
      const id = prev.length ? Math.max(...prev.map(i => i.id || 0)) + 1 : 1;
      return [...prev, { ...data, id }];
    });
  };

  const deleteInsight = (id: number) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const saveCoaching = (data: Coaching) => {
    setCoachings(prev => {
      if (data.id != null) {
        return prev.map(c => (c.id === data.id ? data : c));
      }
      const id = prev.length ? Math.max(...prev.map(c => c.id || 0)) + 1 : 1;
      return [...prev, { ...data, id }];
    });
  };

  const deleteCoaching = (id: number) => {
    setCoachings(prev => prev.filter(c => c.id !== id));
  };

  const saveReport = (data: Report) => {
    setReports(prev => {
      if (data.id != null) {
        return prev.map(r => (r.id === data.id ? data : r));
      }
      const id = prev.length ? Math.max(...prev.map(r => r.id || 0)) + 1 : 1;
      return [...prev, { ...data, id }];
    });
  };

  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const saveFaq = (data: FAQ) => {
    setFaqs(prev => {
      if (data.id != null) {
        return prev.map(f => (f.id === data.id ? data : f));
      }
      const id = prev.length ? Math.max(...prev.map(f => f.id || 0)) + 1 : 1;
      return [...prev, { ...data, id }];
    });
  };

  const deleteFaq = (id: number) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
  };

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
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">Announcements</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add announcement"
                  onClick={() => {
                    setEditingAnnouncement(undefined);
                    setAnnouncementOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              {announcements.length ? (
                announcements.map(a => (
                  <div key={a.id} className="relative group">
                    <AnnouncementCard title={a.title} date={a.date || ''} />
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingAnnouncement(a); setAnnouncementOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteAnnouncement(a.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
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
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">Training & Resources</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add resource"
                  onClick={() => {
                    setEditingResource(undefined);
                    setResourceOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {resources.length ? (
                resources.map(r => (
                  <div key={r.id} className="relative group">
                    <ResourceCard title={r.title} type={r.type || 'Guide'} href={r.link} />
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingResource(r); setResourceOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteResource(r.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
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
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">Agent Insights</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add insight"
                  onClick={() => {
                    setEditingInsight(undefined);
                    setInsightOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {insights.length ? (
                insights.map(i => (
                  <div key={i.id} className="relative group">
                    <InsightCard summary={i.takeaway} timestamp={i.date} />
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingInsight(i); setInsightOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteInsight(i.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
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
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">Adoption Coaching</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add coaching"
                  onClick={() => {
                    setEditingCoaching(undefined);
                    setCoachingOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {coachings.length ? (
                coachings.map(c => (
                  <div key={c.id} className="relative group py-2 border-b last:border-b-0">
                    <p className="text-sm font-medium text-forest-green">{c.topic}</p>
                    <p className="text-xs text-slate-gray">{c.description}</p>
                    {c.actions && <p className="text-xs mt-1">{c.actions}</p>}
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingCoaching(c); setCoachingOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteCoaching(c.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState message="Pick a time to continue your roadmap." />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">Reports & KPIs</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add report"
                  onClick={() => {
                    setEditingReport(undefined);
                    setReportOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {reports.length ? (
                reports.map(r => (
                  <div key={r.id} className="relative group">
                    <p className="text-sm font-medium text-forest-green">{r.name} ({r.period})</p>
                    <KPITile label={r.kpi.metric} value={`${r.kpi.value}/${r.kpi.target}`} />
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingReport(r); setReportOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteReport(r.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState message="No reports yet." />
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-forest-green">FAQ</CardTitle>
              {userRole === 'Admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Add FAQ"
                  onClick={() => {
                    setEditingFaq(undefined);
                    setFaqOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {faqs.length ? (
                faqs.map(f => (
                  <div key={f.id} className="relative group py-2 border-b last:border-b-0">
                    <p className="text-sm font-medium text-forest-green">{f.question}</p>
                    <p className="text-xs text-slate-gray">{f.answer}</p>
                    {userRole === 'Admin' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingFaq(f); setFaqOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => deleteFaq(f.id!)}>
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState message="Short answers coming soon." />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AnnouncementForm
        open={announcementOpen}
        onOpenChange={(o) => {
          if (!o) setEditingAnnouncement(undefined);
          setAnnouncementOpen(o);
        }}
        onSave={saveAnnouncement}
        initialData={editingAnnouncement}
      />
      <ResourceForm
        open={resourceOpen}
        onOpenChange={(o) => {
          if (!o) setEditingResource(undefined);
          setResourceOpen(o);
        }}
        onSave={saveResource}
        initialData={editingResource}
      />
      <InsightForm
        open={insightOpen}
        onOpenChange={(o) => {
          if (!o) setEditingInsight(undefined);
          setInsightOpen(o);
        }}
        onSave={saveInsight}
        initialData={editingInsight}
      />
      <CoachingForm
        open={coachingOpen}
        onOpenChange={(o) => {
          if (!o) setEditingCoaching(undefined);
          setCoachingOpen(o);
        }}
        onSave={saveCoaching}
        initialData={editingCoaching}
      />
      <ReportForm
        open={reportOpen}
        onOpenChange={(o) => {
          if (!o) setEditingReport(undefined);
          setReportOpen(o);
        }}
        onSave={saveReport}
        initialData={editingReport}
      />
      <FAQForm
        open={faqOpen}
        onOpenChange={(o) => {
          if (!o) setEditingFaq(undefined);
          setFaqOpen(o);
        }}
        onSave={saveFaq}
        initialData={editingFaq}
      />

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
