import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pencil,
  Trash2,
  Megaphone,
  BookOpen,
  Link as LinkIcon,
  Users,
  BarChart2,
  HelpCircle,
  Plus,
  FileText,
  Bot,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Edit,
  X,
  Copy
} from 'lucide-react';
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
  session_date?: string;
  session_duration?: number;
  session_leader_id?: string;
  meeting_link?: string;
  session_status?: string;
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

interface AiTool {
  id: string;
  ai_tool: string;
  url?: string;
  comments?: string;
  companies: string[];
}

type SectionKey =
  | 'announcements'
  | 'resources'
  | 'links'
  | 'coaching'
  | 'reports'
  | 'faqs'
  | 'aiTools';

const PortalContentManager: React.FC<{ companies: CompanyOption[]; currentAdmin?: string }> = ({ companies, currentAdmin }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    announcements: false,
    resources: false,
    links: false,
    coaching: false,
    reports: false,
    faqs: false,
    aiTools: false
  });

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
        fetchFaqs(),
        fetchAiTools()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchAllData();
    toast.success('Content data refreshed');
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
      session_date: item.session_date || '',
      session_duration: item.session_duration || 30,
      session_leader_id: item.session_leader_id || '',
      meeting_link: item.meeting_link || '',
      session_status: item.session_status || 'Scheduled',
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

  const fetchAiTools = async () => {
    const { data, error } = await supabase
      .from('ai_tools')
      .select(`
        *,
        ai_tool_companies(company_id)
      `);
    
    if (error) throw error;
    
    const transformedData = data?.map((item: any) => ({
      id: item.id,
      ai_tool: item.ai_tool || '',
      url: item.url || '',
      comments: item.comments || '',
      companies: item.ai_tool_companies?.map((atc: any) => atc.company_id) || []
    })) || [];
    
    setAiTools(transformedData);
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
  const emptyCoaching: Coaching = { 
    id: '', 
    topic: '', 
    description: '', 
    media: '', 
    contact: '', 
    steps: '', 
    companies: [],
    session_date: '',
    session_duration: 30,
    session_leader_id: '',
    meeting_link: '',
    session_status: 'Scheduled'
  };
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

  // AI Tools state
  const [aiToolOpen, setAiToolOpen] = useState(false);
  const [editingAiTool, setEditingAiTool] = useState<AiTool | null>(null);
  const emptyAiTool: AiTool = { id: '', ai_tool: '', url: '', comments: '', companies: [] };
  const [aiToolForm, setAiToolForm] = useState<AiTool>(emptyAiTool);

  // Helpers
  const toggleSelection = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];

  const renderCompanies = (companyIds: string[]) => {
    const names = companyIds.map(id => companies.find(c => c.id === id)?.name || id);
    if (names.length <= 1) {
      return names[0] ? <span className="text-forest-green">{names[0]}</span> : 'None';
    }
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            View ({names.length})
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Companies</DialogTitle>
          </DialogHeader>
          <ul className="list-disc pl-4">
            {names.map((name, idx) => (
              <li key={idx} className="text-forest-green">{name}</li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    );
  };

  // Save handlers - Enhanced with proper error handling and notifications
  const saveAnnouncement = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!announcementForm.title || !announcementForm.author) {
        throw new Error('Title and author are required');
      }
      
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            title: announcementForm.title,
            author: announcementForm.author,
            summary: announcementForm.summary,
            content: announcementForm.content,
            url: announcementForm.url || null,
            created_by: user.id
          })
          .eq('id', editingAnnouncement.id);
        
        if (error) {
          throw new Error(`Failed to update announcement: ${error.message}`);
        }
        
        // Update company assignments
        const { error: deleteError } = await supabase
          .from('announcement_companies')
          .delete()
          .eq('announcement_id', editingAnnouncement.id);
          
        if (deleteError) {
          throw new Error(`Failed to clear company assignments: ${deleteError.message}`);
        }
        
        if (announcementForm.companies.length > 0) {
          const { error: assignError } = await supabase
            .from('announcement_companies')
            .insert(
              announcementForm.companies.map(companyId => ({
                announcement_id: editingAnnouncement.id,
                company_id: companyId
              }))
            );
          
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
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
            url: announcementForm.url || null,
            created_by: user.id
          })
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to create announcement: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No data returned from announcement creation');
        }
        
        // Create company assignments
        if (announcementForm.companies.length > 0) {
          const { error: assignError } = await supabase
            .from('announcement_companies')
            .insert(
              announcementForm.companies.map(companyId => ({
                announcement_id: data.id,
                company_id: companyId
              }))
            );
          
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }
      
      await fetchAnnouncements();
      toast.success(editingAnnouncement ? 'Announcement updated successfully' : 'Announcement created successfully');
      
      setAnnouncementOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementForm(emptyAnnouncement);
    } catch (error) {
      console.error('Error saving announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save announcement: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveResource = async () => {
    try {
      setLoading(true);
      let contentId: string;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingResource) {
        const { error } = await supabase.from('portal_resources').update({
          title: resourceForm.title,
          description: resourceForm.description,
          link: resourceForm.link || null,
          category: resourceForm.category,
          created_by: user.id
        }).eq('id', editingResource.id);

        if (error) {
          throw new Error(`Failed to update resource: ${error.message}`);
        }
        contentId = editingResource.id;

        // Get current company assignments to compare
        const { data: currentAssignments } = await supabase
          .from('portal_resource_companies')
          .select('company_id')
          .eq('resource_id', editingResource.id);
        
        const currentCompanyIds = new Set(currentAssignments?.map(a => a.company_id) || []);
        const newCompanyIds = new Set(resourceForm.companies);
        
        // Only update assignments if they changed
        const assignmentsChanged = currentCompanyIds.size !== newCompanyIds.size || 
          [...currentCompanyIds].some(id => !newCompanyIds.has(id));
        
        if (assignmentsChanged) {
          const { error: deleteError } = await supabase.from('portal_resource_companies').delete().eq('resource_id', editingResource.id);
          if (deleteError) {
            throw new Error(`Failed to update company assignments: ${deleteError.message}`);
          }
          
          if (resourceForm.companies.length > 0) {
            const { error: assignError } = await supabase.from('portal_resource_companies').insert(
              resourceForm.companies.map(companyId => ({
                resource_id: editingResource.id,
                company_id: companyId
              }))
            );
            if (assignError) {
              throw new Error(`Failed to assign to companies: ${assignError.message}`);
            }
          }
        }
      } else {
        const { data, error } = await supabase.from('portal_resources').insert({
          title: resourceForm.title,
          description: resourceForm.description,
          link: resourceForm.link || null,
          category: resourceForm.category,
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create resource: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from resource creation');
        }
        contentId = data.id;

        if (resourceForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('portal_resource_companies').insert(
            resourceForm.companies.map(companyId => ({
              resource_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchResources();
      toast.success(editingResource ? 'Resource updated successfully' : 'Resource created successfully');
      setResourceOpen(false);
      setEditingResource(null);
      setResourceForm(emptyResource);
    } catch (error) {
      console.error('Error saving resource:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save resource: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveLink = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingLink) {
        const { error } = await supabase.from('useful_links').update({
          title: linkForm.title,
          description: linkForm.description,
          url: linkForm.url,
          created_by: user.id
        }).eq('id', editingLink.id);

        if (error) {
          throw new Error(`Failed to update link: ${error.message}`);
        }

        // Get current company assignments to compare
        const { data: currentAssignments } = await supabase
          .from('useful_link_companies')
          .select('company_id')
          .eq('link_id', editingLink.id);
        
        const currentCompanyIds = new Set(currentAssignments?.map(a => a.company_id) || []);
        const newCompanyIds = new Set(linkForm.companies);
        
        // Only update assignments if they changed
        const assignmentsChanged = currentCompanyIds.size !== newCompanyIds.size || 
          [...currentCompanyIds].some(id => !newCompanyIds.has(id));
        
        if (assignmentsChanged) {
          const { error: deleteError } = await supabase.from('useful_link_companies').delete().eq('link_id', editingLink.id);
          if (deleteError) {
            throw new Error(`Failed to update company assignments: ${deleteError.message}`);
          }
          
          if (linkForm.companies.length > 0) {
            const { error: assignError } = await supabase.from('useful_link_companies').insert(
              linkForm.companies.map(companyId => ({
                link_id: editingLink.id,
                company_id: companyId
              }))
            );
            if (assignError) {
              throw new Error(`Failed to assign to companies: ${assignError.message}`);
            }
          }
        }
      } else {
        const { data, error } = await supabase.from('useful_links').insert({
          title: linkForm.title,
          description: linkForm.description,
          url: linkForm.url,
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create link: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from link creation');
        }

        if (linkForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('useful_link_companies').insert(
            linkForm.companies.map(companyId => ({
              link_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchUsefulLinks();
      toast.success(editingLink ? 'Link updated successfully' : 'Link created successfully');
      setLinkOpen(false);
      setEditingLink(null);
      setLinkForm(emptyLink);
    } catch (error) {
      console.error('Error saving link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save link: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  const saveCoaching = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingCoaching) {
        const { error } = await supabase.from('adoption_coaching').update({
          topic: coachingForm.topic,
          description: coachingForm.description,
          media: coachingForm.media || null,
          contact: coachingForm.contact,
          steps: coachingForm.steps || null,
          session_date: coachingForm.session_date || null,
          session_duration: coachingForm.session_duration || 30,
          session_leader_id: coachingForm.session_leader_id || null,
          meeting_link: coachingForm.meeting_link || null,
      session_status: coachingForm.session_status || 'Scheduled',
          created_by: user.id
        }).eq('id', editingCoaching.id);

        if (error) {
          throw new Error(`Failed to update coaching session: ${error.message}`);
        }

        // Get current company assignments to compare
        const { data: currentAssignments } = await supabase
          .from('adoption_coaching_companies')
          .select('company_id')
          .eq('coaching_id', editingCoaching.id);
        
        const currentCompanyIds = new Set(currentAssignments?.map(a => a.company_id) || []);
        const newCompanyIds = new Set(coachingForm.companies);
        
        // Only update assignments if they changed
        const assignmentsChanged = currentCompanyIds.size !== newCompanyIds.size || 
          [...currentCompanyIds].some(id => !newCompanyIds.has(id));
        
        if (assignmentsChanged) {
          const { error: deleteError } = await supabase.from('adoption_coaching_companies').delete().eq('coaching_id', editingCoaching.id);
          if (deleteError) {
            throw new Error(`Failed to update company assignments: ${deleteError.message}`);
          }
          
          if (coachingForm.companies.length > 0) {
            const { error: assignError } = await supabase.from('adoption_coaching_companies').insert(
              coachingForm.companies.map(companyId => ({
                coaching_id: editingCoaching.id,
                company_id: companyId
              }))
            );
            if (assignError) {
              throw new Error(`Failed to assign to companies: ${assignError.message}`);
            }
          }
        }
      } else {
        const { data, error } = await supabase.from('adoption_coaching').insert({
          topic: coachingForm.topic,
          description: coachingForm.description,
          media: coachingForm.media || null,
          contact: coachingForm.contact,
          steps: coachingForm.steps || null,
          session_date: coachingForm.session_date || null,
          session_duration: coachingForm.session_duration || 30,
          session_leader_id: coachingForm.session_leader_id || null,
          meeting_link: coachingForm.meeting_link || null,
          session_status: coachingForm.session_status || 'Scheduled',
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create coaching session: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from coaching session creation');
        }

        if (coachingForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('adoption_coaching_companies').insert(
            coachingForm.companies.map(companyId => ({
              coaching_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchCoaching();
      toast.success(editingCoaching ? 'Coaching session updated successfully' : 'Coaching session created successfully');
      setCoachingOpen(false);
      setEditingCoaching(null);
      setCoachingForm(emptyCoaching);
    } catch (error) {
      console.error('Error saving coaching session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save coaching session: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  const saveReport = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingReport) {
        const { error } = await supabase.from('reports').update({
          name: reportForm.name,
          kpis: reportForm.kpis as any,
          period: reportForm.period,
          link: reportForm.link || null,
          notes: reportForm.notes || null,
          created_by: user.id
        }).eq('id', editingReport.id);

        if (error) {
          throw new Error(`Failed to update report: ${error.message}`);
        }

        // Get current company assignments to compare
        const { data: currentAssignments } = await supabase
          .from('report_companies')
          .select('company_id')
          .eq('report_id', editingReport.id);
        
        const currentCompanyIds = new Set(currentAssignments?.map(a => a.company_id) || []);
        const newCompanyIds = new Set(reportForm.companies);
        
        // Only update assignments if they changed
        const assignmentsChanged = currentCompanyIds.size !== newCompanyIds.size || 
          [...currentCompanyIds].some(id => !newCompanyIds.has(id));
        
        if (assignmentsChanged) {
          const { error: deleteError } = await supabase.from('report_companies').delete().eq('report_id', editingReport.id);
          if (deleteError) {
            throw new Error(`Failed to update company assignments: ${deleteError.message}`);
          }
          
          if (reportForm.companies.length > 0) {
            const { error: assignError } = await supabase.from('report_companies').insert(
              reportForm.companies.map(companyId => ({
                report_id: editingReport.id,
                company_id: companyId
              }))
            );
            if (assignError) {
              throw new Error(`Failed to assign to companies: ${assignError.message}`);
            }
          }
        }
      } else {
        const { data, error } = await supabase.from('reports').insert({
          name: reportForm.name,
          kpis: reportForm.kpis as any,
          period: reportForm.period,
          link: reportForm.link || null,
          notes: reportForm.notes || null,
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create report: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from report creation');
        }

        if (reportForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('report_companies').insert(
            reportForm.companies.map(companyId => ({
              report_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchReports();
      toast.success(editingReport ? 'Report updated successfully' : 'Report created successfully');
      setReportOpen(false);
      setEditingReport(null);
      setReportForm(emptyReport);
    } catch (error) {
      console.error('Error saving report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save report: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveFaq = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingFaq) {
        const { error } = await supabase.from('faqs').update({
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          updated_by: faqForm.updatedBy,
          goal: faqForm.goal,
          created_by: user.id
        }).eq('id', editingFaq.id);

        if (error) {
          throw new Error(`Failed to update FAQ: ${error.message}`);
        }

        // Only update assignments if they changed
        const { data: currentAssignments } = await supabase
          .from('faq_companies')
          .select('company_id')
          .eq('faq_id', editingFaq.id);
        
        const currentCompanyIds = new Set(currentAssignments?.map(a => a.company_id) || []);
        const newCompanyIds = new Set(faqForm.companies);
        
        const assignmentsChanged = currentCompanyIds.size !== newCompanyIds.size || 
          [...currentCompanyIds].some(id => !newCompanyIds.has(id));
        
        if (assignmentsChanged) {
          const { error: deleteError } = await supabase.from('faq_companies').delete().eq('faq_id', editingFaq.id);
          if (deleteError) {
            throw new Error(`Failed to update company assignments: ${deleteError.message}`);
          }
          
          if (faqForm.companies.length > 0) {
            const { error: assignError } = await supabase.from('faq_companies').insert(
              faqForm.companies.map(companyId => ({
                faq_id: editingFaq.id,
                company_id: companyId
              }))
            );
            if (assignError) {
              throw new Error(`Failed to assign to companies: ${assignError.message}`);
            }
          }
        }
      } else {
        const { data, error } = await supabase.from('faqs').insert({
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          updated_by: faqForm.updatedBy,
          goal: faqForm.goal,
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create FAQ: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from FAQ creation');
        }

        if (faqForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('faq_companies').insert(
            faqForm.companies.map(companyId => ({
              faq_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchFaqs();
      toast.success(editingFaq ? 'FAQ updated successfully' : 'FAQ created successfully');
      setFaqOpen(false);
      setEditingFaq(null);
      setFaqForm(emptyFaq);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save FAQ: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveAiTool = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!aiToolForm.ai_tool) {
        throw new Error('AI Tool name is required');
      }
      
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      if (editingAiTool) {
        const { error } = await supabase.from('ai_tools').update({
          ai_tool: aiToolForm.ai_tool,
          url: aiToolForm.url,
          comments: aiToolForm.comments,
          created_by: user.id
        }).eq('id', editingAiTool.id);

        if (error) {
          throw new Error(`Failed to update AI tool: ${error.message}`);
        }

        const { error: deleteError } = await supabase.from('ai_tool_companies').delete().eq('ai_tool_id', editingAiTool.id);
        if (deleteError) {
          throw new Error(`Failed to clear company assignments: ${deleteError.message}`);
        }
        
        if (aiToolForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('ai_tool_companies').insert(
            aiToolForm.companies.map(companyId => ({
              ai_tool_id: editingAiTool.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      } else {
        const { data, error } = await supabase.from('ai_tools').insert({
          ai_tool: aiToolForm.ai_tool,
          url: aiToolForm.url,
          comments: aiToolForm.comments,
          created_by: user.id
        }).select().single();

        if (error) {
          throw new Error(`Failed to create AI tool: ${error.message}`);
        }
        if (!data) {
          throw new Error('No data returned from AI tool creation');
        }

        if (aiToolForm.companies.length > 0) {
          const { error: assignError } = await supabase.from('ai_tool_companies').insert(
            aiToolForm.companies.map(companyId => ({
              ai_tool_id: data.id,
              company_id: companyId
            }))
          );
          if (assignError) {
            throw new Error(`Failed to assign to companies: ${assignError.message}`);
          }
        }
      }

      await fetchAiTools();
      toast.success(editingAiTool ? 'AI Tool updated successfully' : 'AI Tool created successfully');
      setAiToolOpen(false);
      setEditingAiTool(null);
      setAiToolForm(emptyAiTool);
    } catch (error) {
      console.error('Error saving AI Tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save AI Tool: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Table helpers and column definitions
  const handleEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncement(item);
    setAnnouncementForm(item);
    setAnnouncementOpen(true);
  };

  const duplicateAnnouncement = (item: Announcement) => {
    const duplicatedItem = {
      ...item,
      id: '',
      title: `${item.title} (Copy)`,
      companies: []
    };
    setEditingAnnouncement(null);
    setAnnouncementForm(duplicatedItem);
    setAnnouncementOpen(true);
    toast.success('Announcement duplicated - ready for editing');
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcement_companies').delete().eq('announcement_id', id);
    await supabase.from('announcements').delete().eq('id', id);
    await fetchAnnouncements();
    toast.success('Announcement deleted');
  };

  const announcementColumns: Column<Announcement>[] = [
    { key: 'title', label: 'Title', initialWidth: 150 },
    { key: 'author', label: 'Author', initialWidth: 120 },
    { key: 'summary', label: 'Summary', initialWidth: 200 },
    { key: 'content', label: 'Content', initialWidth: 200 },
    { key: 'url', label: 'URL', initialWidth: 150 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditAnnouncement(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateAnnouncement(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteAnnouncement(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
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

  const duplicateResource = (item: Resource) => {
    const duplicatedItem = {
      ...item,
      id: '',
      title: `${item.title} (Copy)`,
      companies: []
    };
    setEditingResource(null);
    setResourceForm(duplicatedItem);
    setResourceOpen(true);
    toast.success('Resource duplicated - ready for editing');
  };

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    await supabase.from('portal_resource_companies').delete().eq('resource_id', id);
    await supabase.from('portal_resources').delete().eq('id', id);
    await fetchResources();
    toast.success('Resource deleted');
  };

  const resourceColumns: Column<Resource>[] = [
    { key: 'title', label: 'Title', initialWidth: 150 },
    { key: 'description', label: 'Description', initialWidth: 200 },
    { key: 'link', label: 'Link', initialWidth: 150 },
    { key: 'category', label: 'Category', initialWidth: 120 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditResource(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateResource(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteResource(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
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

  const duplicateUsefulLink = (item: UsefulLink) => {
    const duplicatedItem = {
      ...item,
      id: '',
      title: `${item.title} (Copy)`,
      companies: []
    };
    setEditingLink(null);
    setLinkForm(duplicatedItem);
    setLinkOpen(true);
    toast.success('Useful link duplicated - ready for editing');
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    await supabase.from('useful_link_companies').delete().eq('link_id', id);
    await supabase.from('useful_links').delete().eq('id', id);
    await fetchUsefulLinks();
    toast.success('Link deleted');
  };

  const linkColumns: Column<UsefulLink>[] = [
    { key: 'title', label: 'Title', initialWidth: 150 },
    {
      key: 'url',
      label: 'URL',
      initialWidth: 150,
      render: (item) => (
        <a href={item.url} className="text-blue-600" target="_blank" rel="noreferrer">
          {item.url}
        </a>
      )
    },
    { key: 'description', label: 'Description', initialWidth: 200 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditLink(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateUsefulLink(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteLink(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
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

  const duplicateCoaching = (item: Coaching) => {
    const duplicatedItem = {
      ...item,
      id: '',
      topic: `${item.topic} (Copy)`,
      companies: []
    };
    setEditingCoaching(null);
    setCoachingForm(duplicatedItem);
    setCoachingOpen(true);
    toast.success('Coaching session duplicated - ready for editing');
  };

  const deleteCoaching = async (id: string) => {
    if (!confirm('Delete this coaching?')) return;
    await supabase.from('adoption_coaching_companies').delete().eq('coaching_id', id);
    await supabase.from('adoption_coaching').delete().eq('id', id);
    await fetchCoaching();
    toast.success('Coaching deleted');
  };

  const coachingColumns: Column<Coaching>[] = [
    { key: 'topic', label: 'Topic', initialWidth: 150 },
    { key: 'description', label: 'Description', initialWidth: 200 },
    { key: 'media', label: 'Details', initialWidth: 120 },
    { key: 'contact', label: 'Contact', initialWidth: 120 },
    { key: 'steps', label: 'Session Phase', initialWidth: 150 },
    { key: 'session_date', label: 'Session Date', initialWidth: 120, render: (item) => item.session_date ? new Date(item.session_date).toLocaleDateString() : 'Not set' },
    { key: 'session_status', label: 'Status', initialWidth: 120 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditCoaching(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateCoaching(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteCoaching(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
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

  const duplicateReport = (item: Report) => {
    const duplicatedItem = {
      ...item,
      id: '',
      name: `${item.name} (Copy)`,
      companies: []
    };
    setEditingReport(null);
    setReportForm(duplicatedItem);
    setReportOpen(true);
    toast.success('Report duplicated - ready for editing');
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    await supabase.from('report_companies').delete().eq('report_id', id);
    await supabase.from('reports').delete().eq('id', id);
    await fetchReports();
    toast.success('Report deleted');
  };

  const reportColumns: Column<Report>[] = [
    { key: 'name', label: 'Name', initialWidth: 150 },
    { key: 'period', label: 'Period', initialWidth: 120 },
    { key: 'kpis', label: 'KPIs', initialWidth: 200, render: (item) => item.kpis.map(k => `${k.name}:${k.value}`).join(', ') },
    { key: 'link', label: 'Link', initialWidth: 150 },
    { key: 'notes', label: 'Notes', initialWidth: 200 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditReport(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateReport(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteReport(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
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

  const duplicateFaq = (item: Faq) => {
    const duplicatedItem = {
      ...item,
      id: '',
      question: `${item.question} (Copy)`,
      companies: []
    };
    setEditingFaq(null);
    setFaqForm(duplicatedItem);
    setFaqOpen(true);
    toast.success('FAQ duplicated - ready for editing');
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    await supabase.from('faq_companies').delete().eq('faq_id', id);
    await supabase.from('faqs').delete().eq('id', id);
    await fetchFaqs();
    toast.success('FAQ deleted');
  };

  const handleEditAiTool = (item: AiTool) => {
    setEditingAiTool(item);
    setAiToolForm(item);
    setAiToolOpen(true);
  };

  const duplicateAiTool = (item: AiTool) => {
    const duplicatedItem = {
      ...item,
      id: '',
      ai_tool: `${item.ai_tool} (Copy)`,
      companies: []
    };
    setEditingAiTool(null);
    setAiToolForm(duplicatedItem);
    setAiToolOpen(true);
    toast.success('AI Tool duplicated - ready for editing');
  };

  const deleteAiTool = async (id: string) => {
    if (!confirm('Delete this AI Tool?')) return;
    await supabase.from('ai_tool_companies').delete().eq('ai_tool_id', id);
    await supabase.from('ai_tools').delete().eq('id', id);
    await fetchAiTools();
    toast.success('AI Tool deleted');
  };

  const faqColumns: Column<Faq>[] = [
    { key: 'question', label: 'Question', initialWidth: 200 },
    { key: 'answer', label: 'Answer', initialWidth: 200 },
    { key: 'category', label: 'Category', initialWidth: 120 },
    { key: 'updatedBy', label: 'Updated By', initialWidth: 120 },
    { key: 'goal', label: 'Goal', initialWidth: 150 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditFaq(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateFaq(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteFaq(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  const aiToolColumns: Column<AiTool>[] = [
    { key: 'ai_tool', label: 'AI Tool', initialWidth: 200 },
    { key: 'url', label: 'URL', initialWidth: 200 },
    { key: 'comments', label: 'Comments', initialWidth: 200 },
    { key: 'companies', label: 'Companies', initialWidth: 150, render: (item) => renderCompanies(item.companies) },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      initialWidth: 80,
      render: (item) => (
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => handleEditAiTool(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateAiTool(item)} title="Duplicate">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteAiTool(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-forest-green">
                <FileText className="h-5 w-5" />
                Content Management
              </CardTitle>
              <CardDescription>Manage portal content for client companies.</CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="w-full lg:w-auto text-forest-green border-forest-green hover:bg-forest-green/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Announcements */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('announcements')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.announcements}
              aria-controls="announcements-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <Megaphone className="h-5 w-5" />
                Announcements
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.announcements ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              id="announcements-content"
              className={`space-y-4 ${expandedSections.announcements ? 'block' : 'hidden'}`}
            >
              <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                <SortableTable
                  data={announcements}
                  columns={announcementColumns}
                  toolbar={(columnsButton) => (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Announcement
                        </Button>
                      </DialogTrigger>
                      {columnsButton}
                    </div>
                  )}
                />
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
          </section>

          {/* Training & Resources */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('resources')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.resources}
              aria-controls="resources-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <BookOpen className="h-5 w-5" />
                Training & Resources
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.resources ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              id="resources-content"
              className={`space-y-4 ${expandedSections.resources ? 'block' : 'hidden'}`}
            >
              <Dialog open={resourceOpen} onOpenChange={setResourceOpen}>
                <SortableTable
                  data={resources}
                  columns={resourceColumns}
                  toolbar={(columnsButton) => (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Resource
                        </Button>
                      </DialogTrigger>
                      {columnsButton}
                    </div>
                  )}
                />
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
          </section>

          {/* Useful Links */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('links')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.links}
              aria-controls="links-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <LinkIcon className="h-5 w-5" />
                Useful Links
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.links ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div id="links-content" className={`space-y-4 ${expandedSections.links ? 'block' : 'hidden'}`}>
              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <SortableTable
                  data={links}
                  columns={linkColumns}
                  toolbar={(columnsButton) => (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Link
                        </Button>
                      </DialogTrigger>
                      {columnsButton}
                    </div>
                  )}
                />
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
          </section>

          {/* Adoption Coaching */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('coaching')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.coaching}
              aria-controls="coaching-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <Users className="h-5 w-5" />
                Adoption Coaching
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.coaching ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              id="coaching-content"
              className={`space-y-4 ${expandedSections.coaching ? 'block' : 'hidden'}`}
            >
              <Dialog open={coachingOpen} onOpenChange={setCoachingOpen}>
                <SortableTable
                  data={coachings}
                  columns={coachingColumns}
                  toolbar={(columnsButton) => (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Coaching
                        </Button>
                      </DialogTrigger>
                      {columnsButton}
                    </div>
                  )}
                />
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
                        <Label htmlFor="coaching-details">Details (optional)</Label>
                        <Textarea
                          id="coaching-details"
                          value={coachingForm.media || ''}
                          onChange={(e) => setCoachingForm({ ...coachingForm, media: e.target.value })}
                          placeholder="Additional session details, notes, or instructions"
                          rows={3}
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
                        <Label htmlFor="coaching-steps">Session Phase (optional)</Label>
                        <Input
                          id="coaching-steps"
                          value={coachingForm.steps || ''}
                          onChange={(e) => setCoachingForm({ ...coachingForm, steps: e.target.value })}
                          placeholder="e.g., Initial Discovery, Follow-up Session"
                        />
                      </div>
                      
                      {/* Session Management Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="session-date">Session Date & Time</Label>
                          <Input
                            id="session-date"
                            type="datetime-local"
                            value={coachingForm.session_date ? new Date(coachingForm.session_date).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setCoachingForm({ 
                              ...coachingForm, 
                              session_date: e.target.value ? new Date(e.target.value).toISOString() : ''
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="session-duration">Duration (minutes)</Label>
                          <Input
                            id="session-duration"
                            type="number"
                            min="15"
                            max="180"
                            value={coachingForm.session_duration || 30}
                            onChange={(e) => setCoachingForm({ 
                              ...coachingForm, 
                              session_duration: parseInt(e.target.value) || 30
                            })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="meeting-link">Meeting Link (optional)</Label>
                        <Input
                          id="meeting-link"
                          type="url"
                          placeholder="https://zoom.us/j/..."
                          value={coachingForm.meeting_link || ''}
                          onChange={(e) => setCoachingForm({ ...coachingForm, meeting_link: e.target.value })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="session-leader">Session Leader</Label>
                          <Select 
                            value={coachingForm.session_leader_id || ''} 
                            onValueChange={(value) => setCoachingForm({ ...coachingForm, session_leader_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select leader" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">No leader assigned</SelectItem>
                              <SelectItem value="james-hennahane">James Hennahane</SelectItem>
                              <SelectItem value="philip-niemerg">Philip Niemerg</SelectItem>
                              <SelectItem value="rootedai-team">RootedAI Team</SelectItem>
                              {companies.map((company) => (
                                <SelectItem key={`company-${company.id}`} value={`company-${company.id}`}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="session-status">Status</Label>
                          <Select 
                            value={coachingForm.session_status || 'Scheduled'} 
                            onValueChange={(value) => setCoachingForm({ ...coachingForm, session_status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Canceled">Canceled</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Confirmed">Confirmed</SelectItem>
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="Live Now">Live Now</SelectItem>
                              <SelectItem value="Missed / No-Show">Missed / No-Show</SelectItem>
                              <SelectItem value="Not Scheduled">Not Scheduled</SelectItem>
                              <SelectItem value="Ongoing">Ongoing</SelectItem>
                              <SelectItem value="Pending Confirmation">Pending Confirmation</SelectItem>
                              <SelectItem value="Recording Available">Recording Available</SelectItem>
                              <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                              <SelectItem value="Scheduled">Scheduled</SelectItem>
                              <SelectItem value="To Be Scheduled">To Be Scheduled</SelectItem>
                              <SelectItem value="Upcoming">Upcoming</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
          </section>

          {/* Reports & KPIs */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('reports')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.reports}
              aria-controls="reports-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <BarChart2 className="h-5 w-5" />
                Reports & KPIs
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.reports ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              id="reports-content"
              className={`space-y-4 ${expandedSections.reports ? 'block' : 'hidden'}`}
            >
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <SortableTable
                  data={reports}
                  columns={reportColumns}
                  toolbar={(columnsButton) => (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Report
                        </Button>
                      </DialogTrigger>
                      {columnsButton}
                    </div>
                  )}
                />
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
                          size="sm"
                          className="bg-forest-green hover:bg-forest-green/90 transition-colors"
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
          </section>

          {/* FAQs */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('faqs')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.faqs}
              aria-controls="faqs-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <HelpCircle className="h-5 w-5" />
                FAQs
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.faqs ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div id="faqs-content" className={`space-y-4 ${expandedSections.faqs ? 'block' : 'hidden'}`}>
              <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
                <SortableTable
                data={faqs}
                columns={faqColumns}
                toolbar={(columnsButton) => (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add FAQ
                      </Button>
                    </DialogTrigger>
                    {columnsButton}
                  </div>
                )}
              />
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
          </section>

          {/* AI Tools */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('aiTools')}
              className="flex w-full items-center justify-between rounded-md border border-forest-green/20 px-4 py-3 text-left transition-colors hover:bg-forest-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-green focus-visible:ring-offset-2"
              aria-expanded={expandedSections.aiTools}
              aria-controls="ai-tools-content"
            >
              <span className="flex items-center gap-2 text-forest-green font-semibold">
                <Bot className="h-5 w-5" />
                AI Tools
              </span>
              <ChevronRight
                className={`h-5 w-5 text-forest-green transition-transform ${
                  expandedSections.aiTools ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div id="ai-tools-content" className={`space-y-4 ${expandedSections.aiTools ? 'block' : 'hidden'}`}>
              <Dialog open={aiToolOpen} onOpenChange={setAiToolOpen}>
                <SortableTable
                data={aiTools}
                columns={aiToolColumns}
                toolbar={(columnsButton) => (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 mb-2 w-full sm:justify-end">
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add AI Tool
                      </Button>
                    </DialogTrigger>
                    {columnsButton}
                  </div>
                )}
              />
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingAiTool ? 'Edit AI Tool' : 'Add AI Tool'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ai-tool-name">AI Tool Name</Label>
                    <Input
                      id="ai-tool-name"
                      value={aiToolForm.ai_tool}
                      onChange={(e) => setAiToolForm({ ...aiToolForm, ai_tool: e.target.value })}
                      placeholder="Enter AI tool name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ai-tool-url">URL</Label>
                    <Input
                      id="ai-tool-url"
                      value={aiToolForm.url}
                      onChange={(e) => setAiToolForm({ ...aiToolForm, url: e.target.value })}
                      placeholder="Enter tool URL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ai-tool-comments">Comments</Label>
                    <Textarea
                      id="ai-tool-comments"
                      value={aiToolForm.comments}
                      onChange={(e) => setAiToolForm({ ...aiToolForm, comments: e.target.value })}
                      placeholder="Enter comments or instructions"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Assign to Companies</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                      {companies.map((company) => (
                        <div key={company.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ai-tool-company-${company.id}`}
                            checked={aiToolForm.companies.includes(company.id)}
                            onCheckedChange={() =>
                              setAiToolForm({
                                ...aiToolForm,
                                companies: toggleSelection(aiToolForm.companies, company.id)
                              })
                            }
                          />
                          <Label htmlFor={`ai-tool-company-${company.id}`}>{company.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveAiTool} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalContentManager;
