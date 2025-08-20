import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  author: string;
  summary: string;
  content: string;
  url?: string;
  companies: string[];
}

interface Resource {
  id: string;
  title: string;
  description: string;
  link?: string;
  category: string;
  companies: string[];
}

interface Insight {
  id: string;
  title: string;
  takeaway: string;
  detail: string;
  source: string;
  date: string;
  companies: string[];
}

interface Coaching {
  id: string;
  topic: string;
  description: string;
  media?: string;
  contact: string;
  steps?: string;
  companies: string[];
}

interface KPI {
  name: string;
  value: string;
  target: string;
}

interface Report {
  id: string;
  name: string;
  kpis: KPI[];
  period: string;
  link?: string;
  notes?: string;
  companies: string[];
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  updatedBy: string;
  goal: string;
  companies: string[];
}

const PortalContentManager: React.FC<{ companies: CompanyOption[]; currentAdmin?: string }> = ({ companies, currentAdmin }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);

  // Announcement state
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const emptyAnnouncement: Announcement = { id: '', title: '', author: '', summary: '', content: '', url: '', companies: [] };
  const [announcementForm, setAnnouncementForm] = useState<Announcement>(emptyAnnouncement);

  // Resource state
  const [resourceOpen, setResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const emptyResource: Resource = { id: '', title: '', description: '', link: '', category: '', companies: [] };
  const [resourceForm, setResourceForm] = useState<Resource>(emptyResource);

  // Insight state
  const [insightOpen, setInsightOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const emptyInsight: Insight = { id: '', title: '', takeaway: '', detail: '', source: '', date: '', companies: [] };
  const [insightForm, setInsightForm] = useState<Insight>(emptyInsight);

  // Coaching state
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [editingCoaching, setEditingCoaching] = useState<Coaching | null>(null);
  const emptyCoaching: Coaching = { id: '', topic: '', description: '', media: '', contact: '', steps: '', companies: [] };
  const [coachingForm, setCoachingForm] = useState<Coaching>(emptyCoaching);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const emptyReport: Report = { id: '', name: '', kpis: [{ name: '', value: '', target: '' }], period: '', link: '', notes: '', companies: [] };
  const [reportForm, setReportForm] = useState<Report>(emptyReport);

  // FAQ state
  const [faqOpen, setFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const emptyFaq: Faq = { id: '', question: '', answer: '', category: '', updatedBy: currentAdmin || '', goal: '', companies: [] };
  const [faqForm, setFaqForm] = useState<Faq>(emptyFaq);

  const resetForms = () => {
    setAnnouncementForm(emptyAnnouncement);
    setResourceForm(emptyResource);
    setInsightForm(emptyInsight);
    setCoachingForm(emptyCoaching);
    setReportForm(emptyReport);
    setFaqForm(emptyFaq);
  };

  // Helpers
  const toggleSelection = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];

  // Save handlers
  const saveAnnouncement = () => {
    if (editingAnnouncement) {
      setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? { ...announcementForm, id: editingAnnouncement.id } : a));
    } else {
      setAnnouncements(prev => [...prev, { ...announcementForm, id: Date.now().toString() }]);
    }
    setAnnouncementOpen(false);
    setEditingAnnouncement(null);
    setAnnouncementForm(emptyAnnouncement);
  };

  const saveResource = () => {
    if (editingResource) {
      setResources(prev => prev.map(r => r.id === editingResource.id ? { ...resourceForm, id: editingResource.id } : r));
    } else {
      setResources(prev => [...prev, { ...resourceForm, id: Date.now().toString() }]);
    }
    setResourceOpen(false);
    setEditingResource(null);
    setResourceForm(emptyResource);
  };

  const saveInsight = () => {
    if (editingInsight) {
      setInsights(prev => prev.map(i => i.id === editingInsight.id ? { ...insightForm, id: editingInsight.id } : i));
    } else {
      setInsights(prev => [...prev, { ...insightForm, id: Date.now().toString() }]);
    }
    setInsightOpen(false);
    setEditingInsight(null);
    setInsightForm(emptyInsight);
  };

  const saveCoaching = () => {
    if (editingCoaching) {
      setCoachings(prev => prev.map(c => c.id === editingCoaching.id ? { ...coachingForm, id: editingCoaching.id } : c));
    } else {
      setCoachings(prev => [...prev, { ...coachingForm, id: Date.now().toString() }]);
    }
    setCoachingOpen(false);
    setEditingCoaching(null);
    setCoachingForm(emptyCoaching);
  };

  const saveReport = () => {
    if (editingReport) {
      setReports(prev => prev.map(r => r.id === editingReport.id ? { ...reportForm, id: editingReport.id } : r));
    } else {
      setReports(prev => [...prev, { ...reportForm, id: Date.now().toString() }]);
    }
    setReportOpen(false);
    setEditingReport(null);
    setReportForm(emptyReport);
  };

  const saveFaq = () => {
    if (editingFaq) {
      setFaqs(prev => prev.map(f => f.id === editingFaq.id ? { ...faqForm, id: editingFaq.id } : f));
    } else {
      setFaqs(prev => [...prev, { ...faqForm, id: Date.now().toString() }]);
    }
    setFaqOpen(false);
    setEditingFaq(null);
    setFaqForm(emptyFaq);
  };

  // KPI helpers
  const addKpi = () => setReportForm({ ...reportForm, kpis: [...reportForm.kpis, { name: '', value: '', target: '' }] });
  const updateKpi = (index: number, field: keyof KPI, value: string) => {
    const newKpis = [...reportForm.kpis];
    newKpis[index] = { ...newKpis[index], [field]: value };
    setReportForm({ ...reportForm, kpis: newKpis });
  };
  const removeKpi = (index: number) => {
    const newKpis = reportForm.kpis.filter((_, i) => i !== index);
    setReportForm({ ...reportForm, kpis: newKpis });
  };

  return (
    <div className="space-y-8">
      {/* Announcements */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Announcements</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingAnnouncement(null); setAnnouncementOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {announcements.length ? (
            <ul className="space-y-2">
              {announcements.map(a => (
                <li key={a.id} className="flex items-center justify-between">
                  <span>{a.title}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingAnnouncement(a); setAnnouncementForm(a); setAnnouncementOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setAnnouncements(prev => prev.filter(x => x.id !== a.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Training & Resources</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingResource(null); setResourceOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {resources.length ? (
            <ul className="space-y-2">
              {resources.map(r => (
                <li key={r.id} className="flex items-center justify-between">
                  <span>{r.title}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingResource(r); setResourceForm(r); setResourceOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setResources(prev => prev.filter(x => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No resources yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Agent Insights</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingInsight(null); setInsightOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {insights.length ? (
            <ul className="space-y-2">
              {insights.map(i => (
                <li key={i.id} className="flex items-center justify-between">
                  <span>{i.title}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingInsight(i); setInsightForm(i); setInsightOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setInsights(prev => prev.filter(x => x.id !== i.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No insights yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Adoption Coaching */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Adoption Coaching</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingCoaching(null); setCoachingOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {coachings.length ? (
            <ul className="space-y-2">
              {coachings.map(c => (
                <li key={c.id} className="flex items-center justify-between">
                  <span>{c.topic}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingCoaching(c); setCoachingForm(c); setCoachingOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setCoachings(prev => prev.filter(x => x.id !== c.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No coaching content yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Reports & KPIs */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Reports & KPIs</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingReport(null); setReportOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {reports.length ? (
            <ul className="space-y-2">
              {reports.map(r => (
                <li key={r.id} className="flex items-center justify-between">
                  <span>{r.name}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingReport(r); setReportForm(r); setReportOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setReports(prev => prev.filter(x => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          )}
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>FAQs</CardTitle>
          <Button size="sm" onClick={() => { resetForms(); setEditingFaq(null); setFaqOpen(true); }}>Add</Button>
        </CardHeader>
        <CardContent>
          {faqs.length ? (
            <ul className="space-y-2">
              {faqs.map(f => (
                <li key={f.id} className="flex items-center justify-between">
                  <span>{f.question}</span>
                  <div className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingFaq(f); setFaqForm(f); setFaqOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setFaqs(prev => prev.filter(x => x.id !== f.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No FAQs yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Announcement Dialog */}
      <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit' : 'Add'} Announcement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="announcement-title">Post Title</Label>
              <Input id="announcement-title" value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-author">Author</Label>
              <Input id="announcement-author" value={announcementForm.author} onChange={e => setAnnouncementForm({ ...announcementForm, author: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-summary">Summary</Label>
              <Input id="announcement-summary" value={announcementForm.summary} onChange={e => setAnnouncementForm({ ...announcementForm, summary: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-content">Full Content</Label>
              <Textarea id="announcement-content" value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-url">URL</Label>
              <Input id="announcement-url" value={announcementForm.url} onChange={e => setAnnouncementForm({ ...announcementForm, url: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`ann-${c.id}`} checked={announcementForm.companies.includes(c.id)} onCheckedChange={() => setAnnouncementForm({ ...announcementForm, companies: toggleSelection(announcementForm.companies, c.id) })} />
                    <Label htmlFor={`ann-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementOpen(false)}>Cancel</Button>
            <Button onClick={saveAnnouncement}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog open={resourceOpen} onOpenChange={setResourceOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit' : 'Add'} Resource</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resource-title">Resource Title</Label>
              <Input id="resource-title" value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resource-desc">Description</Label>
              <Input id="resource-desc" value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resource-link">File or External Link</Label>
              <Input id="resource-link" value={resourceForm.link} onChange={e => setResourceForm({ ...resourceForm, link: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resource-category">Category/Tag</Label>
              <Input id="resource-category" value={resourceForm.category} onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`res-${c.id}`} checked={resourceForm.companies.includes(c.id)} onCheckedChange={() => setResourceForm({ ...resourceForm, companies: toggleSelection(resourceForm.companies, c.id) })} />
                    <Label htmlFor={`res-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceOpen(false)}>Cancel</Button>
            <Button onClick={saveResource}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insight Dialog */}
      <Dialog open={insightOpen} onOpenChange={setInsightOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingInsight ? 'Edit' : 'Add'} Insight</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="insight-title">Insight Title</Label>
              <Input id="insight-title" value={insightForm.title} onChange={e => setInsightForm({ ...insightForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insight-takeaway">Key Takeaway</Label>
              <Input id="insight-takeaway" value={insightForm.takeaway} onChange={e => setInsightForm({ ...insightForm, takeaway: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insight-detail">Detailed Insight</Label>
              <Textarea id="insight-detail" value={insightForm.detail} onChange={e => setInsightForm({ ...insightForm, detail: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insight-source">Source / Author</Label>
              <Input id="insight-source" value={insightForm.source} onChange={e => setInsightForm({ ...insightForm, source: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insight-date">Date Published</Label>
              <Input id="insight-date" type="date" value={insightForm.date} onChange={e => setInsightForm({ ...insightForm, date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`ins-${c.id}`} checked={insightForm.companies.includes(c.id)} onCheckedChange={() => setInsightForm({ ...insightForm, companies: toggleSelection(insightForm.companies, c.id) })} />
                    <Label htmlFor={`ins-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsightOpen(false)}>Cancel</Button>
            <Button onClick={saveInsight}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coaching Dialog */}
      <Dialog open={coachingOpen} onOpenChange={setCoachingOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingCoaching ? 'Edit' : 'Add'} Coaching</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coaching-topic">Coaching Topic</Label>
              <Input id="coaching-topic" value={coachingForm.topic} onChange={e => setCoachingForm({ ...coachingForm, topic: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coaching-desc">Description</Label>
              <Input id="coaching-desc" value={coachingForm.description} onChange={e => setCoachingForm({ ...coachingForm, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coaching-media">Media Upload or Link</Label>
              <Input id="coaching-media" value={coachingForm.media} onChange={e => setCoachingForm({ ...coachingForm, media: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coaching-contact">Contact Person</Label>
              <Input id="coaching-contact" value={coachingForm.contact} onChange={e => setCoachingForm({ ...coachingForm, contact: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coaching-steps">Action Steps</Label>
              <Textarea id="coaching-steps" value={coachingForm.steps} onChange={e => setCoachingForm({ ...coachingForm, steps: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`coa-${c.id}`} checked={coachingForm.companies.includes(c.id)} onCheckedChange={() => setCoachingForm({ ...coachingForm, companies: toggleSelection(coachingForm.companies, c.id) })} />
                    <Label htmlFor={`coa-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoachingOpen(false)}>Cancel</Button>
            <Button onClick={saveCoaching}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit' : 'Add'} Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input id="report-name" value={reportForm.name} onChange={e => setReportForm({ ...reportForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>KPI(s)</Label>
              {reportForm.kpis.map((kpi, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 items-center">
                  <Input placeholder="Metric" value={kpi.name} onChange={e => updateKpi(index, 'name', e.target.value)} />
                  <Input placeholder="Value" value={kpi.value} onChange={e => updateKpi(index, 'value', e.target.value)} />
                  <Input placeholder="Target" value={kpi.target} onChange={e => updateKpi(index, 'target', e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => removeKpi(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addKpi}>Add KPI</Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-period">Reporting Period</Label>
              <Input id="report-period" value={reportForm.period} onChange={e => setReportForm({ ...reportForm, period: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-link">File Upload or Dashboard Link</Label>
              <Input id="report-link" value={reportForm.link} onChange={e => setReportForm({ ...reportForm, link: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-notes">Notes / Insights</Label>
              <Textarea id="report-notes" value={reportForm.notes} onChange={e => setReportForm({ ...reportForm, notes: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`rep-${c.id}`} checked={reportForm.companies.includes(c.id)} onCheckedChange={() => setReportForm({ ...reportForm, companies: toggleSelection(reportForm.companies, c.id) })} />
                    <Label htmlFor={`rep-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={saveReport}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit' : 'Add'} FAQ</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="faq-question">Question</Label>
              <Input id="faq-question" value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea id="faq-answer" value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faq-category">Category/Tag</Label>
              <Input id="faq-category" value={faqForm.category} onChange={e => setFaqForm({ ...faqForm, category: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faq-updatedBy">Last Updated By</Label>
              <Input id="faq-updatedBy" value={faqForm.updatedBy} onChange={e => setFaqForm({ ...faqForm, updatedBy: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faq-goal">Goal</Label>
              <Input id="faq-goal" value={faqForm.goal} onChange={e => setFaqForm({ ...faqForm, goal: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Client Pages</Label>
              <div className="grid grid-cols-2 gap-2">
                {companies.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox id={`faq-${c.id}`} checked={faqForm.companies.includes(c.id)} onCheckedChange={() => setFaqForm({ ...faqForm, companies: toggleSelection(faqForm.companies, c.id) })} />
                    <Label htmlFor={`faq-${c.id}`}>{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaqOpen(false)}>Cancel</Button>
            <Button onClick={saveFaq}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalContentManager;

