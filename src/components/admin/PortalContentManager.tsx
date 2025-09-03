import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import SortableTable, { Column } from './SortableTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description: string;
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
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnnouncements(),
        fetchResources(),
        fetchUsefulLinks(),
        fetchCoaching(),
        fetchReports(),
        fetchFaqs()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        announcement_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      author: item.author || '',
      summary: item.summary || '',
      content: item.content || '',
      url: item.url || '',
      companies: (item.announcement_companies || []).map((ac: any) => ac.company_id)
    }));
    
    setAnnouncements(transformedData);
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('portal_resources')
      .select(`
        *,
        portal_resource_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      link: item.link || '',
      category: item.category || '',
      companies: (item.portal_resource_companies || []).map((prc: any) => prc.company_id)
    }));
    
    setResources(transformedData);
  };

  const fetchUsefulLinks = async () => {
    const { data, error } = await supabase
      .from('useful_links')
      .select(`
        *,
        useful_link_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      companies: (item.useful_link_companies || []).map((ulc: any) => ulc.company_id)
    }));
    
    setLinks(transformedData);
  };

  const fetchCoaching = async () => {
    const { data, error } = await supabase
      .from('adoption_coaching')
      .select(`
        *,
        adoption_coaching_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      topic: item.topic || '',
      description: item.description || '',
      media: item.media || '',
      contact: item.contact || '',
      steps: item.steps || '',
      companies: (item.adoption_coaching_companies || []).map((acc: any) => acc.company_id)
    }));
    
    setCoachings(transformedData);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        report_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name || '',
      kpis: Array.isArray(item.kpis) ? (item.kpis as unknown as KPI[]) : [{ name: '', value: '', target: '' }],
      period: item.period || '',
      link: item.link || '',
      notes: item.notes || '',
      companies: (item.report_companies || []).map((rc: any) => rc.company_id)
    }));
    
    setReports(transformedData);
  };

  const fetchFaqs = async () => {
    const { data, error } = await supabase
      .from('faqs')
      .select(`
        *,
        faq_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || '',
      updatedBy: item.updated_by || '',
      goal: item.goal || '',
      companies: (item.faq_companies || []).map((fc: any) => fc.company_id)
    }));
    
    setFaqs(transformedData);
  };

  // Form states
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const emptyAnnouncement: Announcement = { id: '', title: '', author: '', summary: '', content: '', url: '', companies: [] };
  const [announcementForm, setAnnouncementForm] = useState<Announcement>(emptyAnnouncement);

  const [resourceOpen, setResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const emptyResource: Resource = { id: '', title: '', description: '', link: '', category: '', companies: [] };
  const [resourceForm, setResourceForm] = useState<Resource>(emptyResource);

  const [linkOpen, setLinkOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const emptyLink: UsefulLink = { id: '', title: '', url: '', description: '', companies: [] };
  const [linkForm, setLinkForm] = useState<UsefulLink>(emptyLink);

  const [coachingOpen, setCoachingOpen] = useState(false);
  const [editingCoaching, setEditingCoaching] = useState<Coaching | null>(null);
  const emptyCoaching: Coaching = { id: '', topic: '', description: '', media: '', contact: '', steps: '', companies: [] };
  const [coachingForm, setCoachingForm] = useState<Coaching>(emptyCoaching);

  const [reportOpen, setReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const emptyReport: Report = { id: '', name: '', kpis: [{ name: '', value: '', target: '' }], period: '', link: '', notes: '', companies: [] };
  const [reportForm, setReportForm] = useState<Report>(emptyReport);

  const [faqOpen, setFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const emptyFaq: Faq = { id: '', question: '', answer: '', category: '', updatedBy: currentAdmin || '', goal: '', companies: [] };
  const [faqForm, setFaqForm] = useState<Faq>(emptyFaq);

  const resetForms = () => {
    setAnnouncementForm(emptyAnnouncement);
    setResourceForm(emptyResource);
    setLinkForm(emptyLink);
    setCoachingForm(emptyCoaching);
    setReportForm(emptyReport);
    setFaqForm(emptyFaq);
  };

  const toggleSelection = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];

  // Save handlers with proper typing
  const saveAnnouncement = async () => {
    try {
      setLoading(true);
      
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: announcementForm.title,
            author: announcementForm.author,
            summary: announcementForm.summary,
            content: announcementForm.content,
            url: announcementForm.url || null
          } as any)
          .eq('id', editingAnnouncement.id as any);
        
        if (error) throw error;
        
        await supabase
          .from('announcement_companies')
          .delete()
          .eq('announcement_id', editingAnnouncement.id as any);
        
        if (announcementForm.companies.length > 0) {
          const { error: assignError } = await supabase
            .from('announcement_companies')
            .insert(
              announcementForm.companies.map(companyId => ({
                announcement_id: editingAnnouncement.id,
                company_id: companyId
              })) as any
            );
          
          if (assignError) throw assignError;
        }
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: announcementForm.title,
            author: announcementForm.author,
            summary: announcementForm.summary,
            content: announcementForm.content,
            url: announcementForm.url || null
          } as any)
          .select()
          .single();
        
        if (error) throw error;
        
        if (announcementForm.companies.length > 0) {
          const { error: assignError } = await supabase
            .from('announcement_companies')
            .insert(
              announcementForm.companies.map(companyId => ({
                announcement_id: data.id,
                company_id: companyId
              })) as any
            );
          
          if (assignError) throw assignError;
        }
      }
      
      await fetchAnnouncements();
      toast.success('Announcement saved successfully');
      
      setAnnouncementOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementForm(emptyAnnouncement);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
    setLoading(false);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await supabase.from('announcement_companies').delete().eq('announcement_id', id as any);
      await supabase.from('announcements').delete().eq('id', id as any);
      await fetchAnnouncements();
      toast.success('Announcement deleted successfully');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  // Announcement columns for table
  const announcementColumns: Column<Announcement>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
    { key: 'summary', label: 'Summary', sortable: false },
    {
      key: 'companies',
      label: 'Companies',
      sortable: false,
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.companies.map(companyId => {
            const company = companies.find(c => c.id === companyId);
            return (
              <span key={companyId} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {company?.name || 'Unknown'}
              </span>
            );
          })}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingAnnouncement(item);
              setAnnouncementForm(item);
              setAnnouncementOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => deleteAnnouncement(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Announcements Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Announcements</CardTitle>
          <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingAnnouncement(null);
                setAnnouncementForm(emptyAnnouncement);
              }}>
                Add Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={announcementForm.author}
                    onChange={(e) => setAnnouncementForm({...announcementForm, author: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="summary">Summary</Label>
                  <Input
                    id="summary"
                    value={announcementForm.summary}
                    onChange={(e) => setAnnouncementForm({...announcementForm, summary: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="url">URL (optional)</Label>
                  <Input
                    id="url"
                    value={announcementForm.url}
                    onChange={(e) => setAnnouncementForm({...announcementForm, url: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Assign to Companies</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {companies.map(company => (
                      <div key={company.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ann-${company.id}`}
                          checked={announcementForm.companies.includes(company.id)}
                          onCheckedChange={() => setAnnouncementForm({
                            ...announcementForm,
                            companies: toggleSelection(announcementForm.companies, company.id)
                          })}
                        />
                        <Label htmlFor={`ann-${company.id}`}>{company.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveAnnouncement}>
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <SortableTable data={announcements} columns={announcementColumns} />
        </CardContent>
      </Card>

      {/* Simplified for now - add other sections as needed */}
      <Card>
        <CardHeader>
          <CardTitle>Other Content Types</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Resources, Links, Coaching, Reports, and FAQs sections coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalContentManager;
