import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      author: item.author || '',
      summary: item.summary || '',
      content: item.content || '',
      url: item.url || '',
      companies: item.announcement_companies?.map((ac: any) => ac.company_id) || []
    })) || [];
    
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      link: item.link || '',
      category: item.category || '',
      companies: item.portal_resource_companies?.map((prc: any) => prc.company_id) || []
    })) || [];
    
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      companies: item.useful_link_companies?.map((ulc: any) => ulc.company_id) || []
    })) || [];
    
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      topic: item.topic || '',
      description: item.description || '',
      media: item.media || '',
      contact: item.contact || '',
      steps: item.steps || '',
      companies: item.adoption_coaching_companies?.map((acc: any) => acc.company_id) || []
    })) || [];
    
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      name: item.name || '',
      kpis: Array.isArray(item.kpis) ? (item.kpis as unknown as KPI[]) : [{ name: '', value: '', target: '' }],
      period: item.period || '',
      link: item.link || '',
      notes: item.notes || '',
      companies: item.report_companies?.map((rc: any) => rc.company_id) || []
    })) || [];
    
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
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || '',
      updatedBy: item.updated_by || '',
      goal: item.goal || '',
      companies: item.faq_companies?.map((fc: any) => fc.company_id) || []
    })) || [];
    
    setFaqs(transformedData);
  };

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

  // Useful link state
  const [linkOpen, setLinkOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const emptyLink: UsefulLink = { id: '', title: '', url: '', description: '', companies: [] };
  const [linkForm, setLinkForm] = useState<UsefulLink>(emptyLink);

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

  // Helpers
  const toggleSelection = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];

  // Save handlers - Simplified with any types to avoid TypeScript issues
  const saveAnnouncement = async () => {
    try {
      setLoading(true);
      
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            title: announcementForm.title,
            author: announcementForm.author,
            summary: announcementForm.summary,
            content: announcementForm.content,
            url: announcementForm.url || null
          })
          .eq('id', editingAnnouncement.id) as any;
        
        if (error) throw error;
        
        // Update company assignments
        await supabase
          .from('announcement_companies')
          .delete()
          .eq('announcement_id', editingAnnouncement.id) as any;
        
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
        // Create new announcement
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
        
        // Create company assignments
        if (announcementForm.companies.length > 0) {
          const { error: assignError } = await supabase
            .from('announcement_companies')
            .insert(
              announcementForm.companies.map(companyId => ({
                announcement_id: (data as any).id,
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

  const saveResource = async () => {
    try {
      setLoading(true);
      if (editingResource) {
        await supabase.from('portal_resources').update({
          title: resourceForm.title,
          description: resourceForm.description,
          link: resourceForm.link || null,
          category: resourceForm.category
        }).eq('id', editingResource.id);

        await supabase.from('portal_resource_companies').delete().eq('resource_id', editingResource.id);
        if (resourceForm.companies.length > 0) {
          await supabase.from('portal_resource_companies').insert(
            resourceForm.companies.map(companyId => ({
              resource_id: editingResource.id,
              company_id: companyId
            }))
          );
        }
      } else {
        const { data } = await supabase.from('portal_resources').insert({
          title: resourceForm.title,
          description: resourceForm.description,
          link: resourceForm.link || null,
          category: resourceForm.category
        }).select().single();

        if (resourceForm.companies.length > 0 && data) {
          await supabase.from('portal_resource_companies').insert(
            resourceForm.companies.map(companyId => ({
              resource_id: data.id,
              company_id: companyId
            }))
          );
        }
      }
      
      await fetchResources();
      toast.success('Resource saved successfully');
      setResourceOpen(false);
      setEditingResource(null);
      setResourceForm(emptyResource);
    } catch (error) {
      toast.error('Failed to save resource');
    }
    setLoading(false);
  };

  const saveLink = async () => {
    try {
      setLoading(true);
      if (editingLink) {
        await supabase.from('useful_links').update({
          title: linkForm.title,
          url: linkForm.url,
          description: linkForm.description
        }).eq('id', editingLink.id);

        await supabase.from('useful_link_companies').delete().eq('link_id', editingLink.id);
        if (linkForm.companies.length > 0) {
          await supabase.from('useful_link_companies').insert(
            linkForm.companies.map(companyId => ({
              link_id: editingLink.id,
              company_id: companyId
            }))
          );
        }
      } else {
        const { data } = await supabase.from('useful_links').insert({
          title: linkForm.title,
          url: linkForm.url,
          description: linkForm.description
        }).select().single();

        if (linkForm.companies.length > 0 && data) {
          await supabase.from('useful_link_companies').insert(
            linkForm.companies.map(companyId => ({
              link_id: data.id,
              company_id: companyId
            }))
          );
        }
      }
      
      await fetchUsefulLinks();
      toast.success('Link saved successfully');
      setLinkOpen(false);
      setEditingLink(null);
      setLinkForm(emptyLink);
    } catch (error) {
      toast.error('Failed to save link');
    }
    setLoading(false);
  };

  const saveCoaching = async () => {
    try {
      setLoading(true);
      if (editingCoaching) {
        await supabase.from('adoption_coaching').update({
          topic: coachingForm.topic,
          description: coachingForm.description,
          media: coachingForm.media || null,
          contact: coachingForm.contact,
          steps: coachingForm.steps || null
        }).eq('id', editingCoaching.id);

        await supabase.from('adoption_coaching_companies').delete().eq('coaching_id', editingCoaching.id);
        if (coachingForm.companies.length > 0) {
          await supabase.from('adoption_coaching_companies').insert(
            coachingForm.companies.map(companyId => ({
              coaching_id: editingCoaching.id,
              company_id: companyId
            }))
          );
        }
      } else {
        const { data } = await supabase.from('adoption_coaching').insert({
          topic: coachingForm.topic,
          description: coachingForm.description,
          media: coachingForm.media || null,
          contact: coachingForm.contact,
          steps: coachingForm.steps || null
        }).select().single();

        if (coachingForm.companies.length > 0 && data) {
          await supabase.from('adoption_coaching_companies').insert(
            coachingForm.companies.map(companyId => ({
              coaching_id: data.id,
              company_id: companyId
            }))
          );
        }
      }
      
      await fetchCoaching();
      toast.success('Coaching saved successfully');
      setCoachingOpen(false);
      setEditingCoaching(null);
      setCoachingForm(emptyCoaching);
    } catch (error) {
      toast.error('Failed to save coaching');
    }
    setLoading(false);
  };

  const saveReport = async () => {
    try {
      setLoading(true);
      if (editingReport) {
        await supabase.from('reports').update({
          name: reportForm.name,
          kpis: reportForm.kpis as any,
          period: reportForm.period,
          link: reportForm.link || null,
          notes: reportForm.notes || null
        }).eq('id', editingReport.id);

        await supabase.from('report_companies').delete().eq('report_id', editingReport.id);
        if (reportForm.companies.length > 0) {
          await supabase.from('report_companies').insert(
            reportForm.companies.map(companyId => ({
              report_id: editingReport.id,
              company_id: companyId
            }))
          );
        }
      } else {
        const { data } = await supabase.from('reports').insert({
          name: reportForm.name,
          kpis: reportForm.kpis as any,
          period: reportForm.period,
          link: reportForm.link || null,
          notes: reportForm.notes || null
        }).select().single();

        if (reportForm.companies.length > 0 && data) {
          await supabase.from('report_companies').insert(
            reportForm.companies.map(companyId => ({
              report_id: data.id,
              company_id: companyId
            }))
          );
        }
      }
      
      await fetchReports();
      toast.success('Report saved successfully');
      setReportOpen(false);
      setEditingReport(null);
      setReportForm(emptyReport);
    } catch (error) {
      toast.error('Failed to save report');
    }
    setLoading(false);
  };

  const saveFaq = async () => {
    try {
      setLoading(true);
      if (editingFaq) {
        await supabase.from('faqs').update({
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          updated_by: faqForm.updatedBy,
          goal: faqForm.goal
        }).eq('id', editingFaq.id);

        await supabase.from('faq_companies').delete().eq('faq_id', editingFaq.id);
        if (faqForm.companies.length > 0) {
          await supabase.from('faq_companies').insert(
            faqForm.companies.map(companyId => ({
              faq_id: editingFaq.id,
              company_id: companyId
            }))
          );
        }
      } else {
        const { data } = await supabase.from('faqs').insert({
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          updated_by: faqForm.updatedBy,
          goal: faqForm.goal
        }).select().single();

        if (faqForm.companies.length > 0 && data) {
          await supabase.from('faq_companies').insert(
            faqForm.companies.map(companyId => ({
              faq_id: data.id,
              company_id: companyId
            }))
          );
        }
      }
      
      await fetchFaqs();
      toast.success('FAQ saved successfully');
      setFaqOpen(false);
      setEditingFaq(null);
      setFaqForm(emptyFaq);
    } catch (error) {
      toast.error('Failed to save FAQ');
    }
    setLoading(false);
  };

  // Table helpers and column definitions
  const handleEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncement(item);
    setAnnouncementForm(item);
    setAnnouncementOpen(true);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcement_companies').delete().eq('announcement_id', id);
    await supabase.from('announcements').delete().eq('id', id);
    await fetchAnnouncements();
    toast.success('Announcement deleted');
  };

  const announcementColumns: Column<Announcement>[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'summary', label: 'Summary' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditAnnouncement(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteAnnouncement(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const handleEditResource = (item: Resource) => {
    setEditingResource(item);
    setResourceForm(item);
    setResourceOpen(true);
  };

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    await supabase.from('portal_resource_companies').delete().eq('resource_id', id);
    await supabase.from('portal_resources').delete().eq('id', id);
    await fetchResources();
    toast.success('Resource deleted');
  };

  const resourceColumns: Column<Resource>[] = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditResource(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteResource(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const handleEditLink = (item: UsefulLink) => {
    setEditingLink(item);
    setLinkForm(item);
    setLinkOpen(true);
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    await supabase.from('useful_link_companies').delete().eq('link_id', id);
    await supabase.from('useful_links').delete().eq('id', id);
    await fetchUsefulLinks();
    toast.success('Link deleted');
  };

  const linkColumns: Column<UsefulLink>[] = [
    { key: 'title', label: 'Title' },
    {
      key: 'url',
      label: 'URL',
      render: (item) => (
        <a href={item.url} className="text-blue-600" target="_blank" rel="noreferrer">
          {item.url}
        </a>
      )
    },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditLink(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteLink(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const handleEditCoaching = (item: Coaching) => {
    setEditingCoaching(item);
    setCoachingForm(item);
    setCoachingOpen(true);
  };

  const deleteCoaching = async (id: string) => {
    if (!confirm('Delete this coaching?')) return;
    await supabase.from('adoption_coaching_companies').delete().eq('coaching_id', id);
    await supabase.from('adoption_coaching').delete().eq('id', id);
    await fetchCoaching();
    toast.success('Coaching deleted');
  };

  const coachingColumns: Column<Coaching>[] = [
    { key: 'topic', label: 'Topic' },
    { key: 'contact', label: 'Contact' },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditCoaching(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteCoaching(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const handleEditReport = (item: Report) => {
    setEditingReport(item);
    setReportForm(item);
    setReportOpen(true);
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    await supabase.from('report_companies').delete().eq('report_id', id);
    await supabase.from('reports').delete().eq('id', id);
    await fetchReports();
    toast.success('Report deleted');
  };

  const reportColumns: Column<Report>[] = [
    { key: 'name', label: 'Name' },
    { key: 'period', label: 'Period' },
    { key: 'notes', label: 'Notes' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditReport(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteReport(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const handleEditFaq = (item: Faq) => {
    setEditingFaq(item);
    setFaqForm(item);
    setFaqOpen(true);
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    await supabase.from('faq_companies').delete().eq('faq_id', id);
    await supabase.from('faqs').delete().eq('id', id);
    await fetchFaqs();
    toast.success('FAQ deleted');
  };

  const faqColumns: Column<Faq>[] = [
    { key: 'question', label: 'Question' },
    { key: 'category', label: 'Category' },
    { key: 'updatedBy', label: 'Updated By' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => handleEditFaq(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => deleteFaq(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
          <CardDescription>Manage portal content for client companies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Announcements */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Announcements</h3>
              <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Announcement</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="author">Author</Label>
                      <Input
                        id="author"
                        value={announcementForm.author}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, author: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="summary">Summary</Label>
                      <Textarea
                        id="summary"
                        value={announcementForm.summary}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, summary: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL (optional)</Label>
                      <Input
                        id="url"
                        value={announcementForm.url || ''}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`ann-company-${company.id}`}
                              checked={announcementForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setAnnouncementForm({
                                  ...announcementForm,
                                  companies: toggleSelection(announcementForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`ann-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveAnnouncement} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={announcements} columns={announcementColumns} />
          </section>

          {/* Training & Resources */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Training & Resources</h3>
              <Dialog open={resourceOpen} onOpenChange={setResourceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Resource</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Training & Resource'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="res-title">Title</Label>
                      <Input
                        id="res-title"
                        value={resourceForm.title}
                        onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-description">Description</Label>
                      <Textarea
                        id="res-description"
                        value={resourceForm.description}
                        onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-link">Link (optional)</Label>
                      <Input
                        id="res-link"
                        value={resourceForm.link || ''}
                        onChange={(e) => setResourceForm({ ...resourceForm, link: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="res-category">Category</Label>
                      <Input
                        id="res-category"
                        value={resourceForm.category}
                        onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`res-company-${company.id}`}
                              checked={resourceForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setResourceForm({
                                  ...resourceForm,
                                  companies: toggleSelection(resourceForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`res-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveResource} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={resources} columns={resourceColumns} />
          </section>

          {/* Useful Links */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Useful Links</h3>
              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Link</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingLink ? 'Edit Useful Link' : 'Add Useful Link'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="link-title">Title</Label>
                      <Input
                        id="link-title"
                        value={linkForm.title}
                        onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        value={linkForm.url}
                        onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="link-description">Description</Label>
                      <Textarea
                        id="link-description"
                        value={linkForm.description}
                        onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`link-company-${company.id}`}
                              checked={linkForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setLinkForm({
                                  ...linkForm,
                                  companies: toggleSelection(linkForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`link-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveLink} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={links} columns={linkColumns} />
          </section>

          {/* Adoption Coaching */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Adoption Coaching</h3>
              <Dialog open={coachingOpen} onOpenChange={setCoachingOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Coaching</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCoaching ? 'Edit Coaching' : 'Add Adoption Coaching'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="coaching-topic">Topic</Label>
                      <Input
                        id="coaching-topic"
                        value={coachingForm.topic}
                        onChange={(e) => setCoachingForm({ ...coachingForm, topic: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="coaching-description">Description</Label>
                      <Textarea
                        id="coaching-description"
                        value={coachingForm.description}
                        onChange={(e) => setCoachingForm({ ...coachingForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="coaching-media">Media (optional)</Label>
                      <Input
                        id="coaching-media"
                        value={coachingForm.media || ''}
                        onChange={(e) => setCoachingForm({ ...coachingForm, media: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="coaching-contact">Contact</Label>
                      <Input
                        id="coaching-contact"
                        value={coachingForm.contact}
                        onChange={(e) => setCoachingForm({ ...coachingForm, contact: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="coaching-steps">Steps (optional)</Label>
                      <Textarea
                        id="coaching-steps"
                        value={coachingForm.steps || ''}
                        onChange={(e) => setCoachingForm({ ...coachingForm, steps: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`coaching-company-${company.id}`}
                              checked={coachingForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setCoachingForm({
                                  ...coachingForm,
                                  companies: toggleSelection(coachingForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`coaching-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveCoaching} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={coachings} columns={coachingColumns} />
          </section>

          {/* Reports & KPIs */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Reports & KPIs</h3>
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Report</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingReport ? 'Edit Report' : 'Add Report & KPIs'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="report-name">Report Name</Label>
                      <Input
                        id="report-name"
                        value={reportForm.name}
                        onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-period">Period</Label>
                      <Input
                        id="report-period"
                        value={reportForm.period}
                        onChange={(e) => setReportForm({ ...reportForm, period: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-link">Link (optional)</Label>
                      <Input
                        id="report-link"
                        value={reportForm.link || ''}
                        onChange={(e) => setReportForm({ ...reportForm, link: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-notes">Notes (optional)</Label>
                      <Textarea
                        id="report-notes"
                        value={reportForm.notes || ''}
                        onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>KPIs</Label>
                      {reportForm.kpis.map((kpi, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 mt-2">
                          <Input
                            placeholder="KPI Name"
                            value={kpi.name}
                            onChange={(e) => {
                              const newKpis = [...reportForm.kpis];
                              newKpis[index] = { ...kpi, name: e.target.value };
                              setReportForm({ ...reportForm, kpis: newKpis });
                            }}
                          />
                          <Input
                            placeholder="Value"
                            value={kpi.value}
                            onChange={(e) => {
                              const newKpis = [...reportForm.kpis];
                              newKpis[index] = { ...kpi, value: e.target.value };
                              setReportForm({ ...reportForm, kpis: newKpis });
                            }}
                          />
                          <Input
                            placeholder="Target"
                            value={kpi.target}
                            onChange={(e) => {
                              const newKpis = [...reportForm.kpis];
                              newKpis[index] = { ...kpi, target: e.target.value };
                              setReportForm({ ...reportForm, kpis: newKpis });
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setReportForm({
                            ...reportForm,
                            kpis: [...reportForm.kpis, { name: '', value: '', target: '' }]
                          })
                        }
                      >
                        Add KPI
                      </Button>
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`report-company-${company.id}`}
                              checked={reportForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setReportForm({
                                  ...reportForm,
                                  companies: toggleSelection(reportForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`report-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveReport} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={reports} columns={reportColumns} />
          </section>

          {/* FAQs */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">FAQs</h3>
              <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add FAQ</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="faq-question">Question</Label>
                      <Input
                        id="faq-question"
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="faq-answer">Answer</Label>
                      <Textarea
                        id="faq-answer"
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="faq-category">Category</Label>
                      <Input
                        id="faq-category"
                        value={faqForm.category}
                        onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="faq-goal">Goal</Label>
                      <Input
                        id="faq-goal"
                        value={faqForm.goal}
                        onChange={(e) => setFaqForm({ ...faqForm, goal: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Assign to Companies</Label>
                      <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`faq-company-${company.id}`}
                              checked={faqForm.companies.includes(company.id)}
                              onCheckedChange={() =>
                                setFaqForm({
                                  ...faqForm,
                                  companies: toggleSelection(faqForm.companies, company.id)
                                })
                              }
                            />
                            <Label htmlFor={`faq-company-${company.id}`}>{company.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveFaq} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <SortableTable data={faqs} columns={faqColumns} />
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalContentManager;
