import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// Announcement
export interface Announcement {
  id?: number;
  title: string;
  author: string;
  summary: string;
  content: string;
  url?: string;
  date?: string;
}

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Announcement) => void;
  initialData?: Announcement;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<Announcement>({ title: '', author: '', summary: '', content: '', url: '' });

  useEffect(() => {
    setForm(initialData || { title: '', author: '', summary: '', content: '', url: '' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Post Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} required />
          <Input placeholder="Summary" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} required />
          <Textarea placeholder="Full Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
          <Input placeholder="Optional URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Training & Resources
export interface Resource {
  id?: number;
  title: string;
  description: string;
  link: string;
  category: string;
  type?: 'Guide' | 'Video' | 'Slide';
}

interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Resource) => void;
  initialData?: Resource;
}

export const ResourceForm: React.FC<ResourceFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<Resource>({ title: '', description: '', link: '', category: '', type: 'Guide' });

  useEffect(() => {
    setForm(initialData || { title: '', description: '', link: '', category: '', type: 'Guide' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Resource Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          <Input placeholder="File Link or URL" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} required />
          <Input placeholder="Category/Tag" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
          <Input placeholder="Type (Guide, Video, etc.)" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'Guide' | 'Video' | 'Slide' })} />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Agent Insights
export interface Insight {
  id?: number;
  title: string;
  takeaway: string;
  detail: string;
  author: string;
  date: string;
}

interface InsightFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Insight) => void;
  initialData?: Insight;
}

export const InsightForm: React.FC<InsightFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<Insight>({ title: '', takeaway: '', detail: '', author: '', date: '' });

  useEffect(() => {
    setForm(initialData || { title: '', takeaway: '', detail: '', author: '', date: '' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Insight' : 'New Insight'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Insight Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Key Takeaway" value={form.takeaway} onChange={e => setForm({ ...form, takeaway: e.target.value })} required />
          <Textarea placeholder="Detailed Insight" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} required />
          <Input placeholder="Source / Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} required />
          <Input type="date" placeholder="Date Published" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Adoption Coaching
export interface Coaching {
  id?: number;
  topic: string;
  description: string;
  media?: string;
  coach: string;
  actions?: string;
}

interface CoachingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Coaching) => void;
  initialData?: Coaching;
}

export const CoachingForm: React.FC<CoachingFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<Coaching>({ topic: '', description: '', media: '', coach: '', actions: '' });

  useEffect(() => {
    setForm(initialData || { topic: '', description: '', media: '', coach: '', actions: '' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Coaching' : 'New Coaching'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Coaching Topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required />
          <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          <Input placeholder="Media Upload or Link" value={form.media} onChange={e => setForm({ ...form, media: e.target.value })} />
          <Input placeholder="Contact Person / Coach" value={form.coach} onChange={e => setForm({ ...form, coach: e.target.value })} required />
          <Textarea placeholder="Optional Action Steps" value={form.actions} onChange={e => setForm({ ...form, actions: e.target.value })} />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Reports & KPIs
export interface KPI {
  metric: string;
  value: string;
  target: string;
}

export interface Report {
  id?: number;
  name: string;
  kpi: KPI;
  period: string;
  link: string;
  notes: string;
}

interface ReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Report) => void;
  initialData?: Report;
}

export const ReportForm: React.FC<ReportFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<Report>({ name: '', kpi: { metric: '', value: '', target: '' }, period: '', link: '', notes: '' });

  useEffect(() => {
    setForm(initialData || { name: '', kpi: { metric: '', value: '', target: '' }, period: '', link: '', notes: '' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  const updateKPI = (field: keyof KPI, value: string) => {
    setForm(prev => ({ ...prev, kpi: { ...prev.kpi, [field]: value } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Report' : 'New Report'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Report Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Metric" value={form.kpi.metric} onChange={e => updateKPI('metric', e.target.value)} required />
            <Input placeholder="Value" value={form.kpi.value} onChange={e => updateKPI('value', e.target.value)} required />
            <Input placeholder="Target" value={form.kpi.target} onChange={e => updateKPI('target', e.target.value)} required />
          </div>
          <Input type="text" placeholder="Date Range / Period" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} required />
          <Input placeholder="File Upload or Dashboard Link" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
          <Textarea placeholder="Notes / Insights" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// FAQ
export interface FAQ {
  id?: number;
  question: string;
  answer: string;
  category: string;
  updatedBy: string;
  goal: string;
}

interface FAQFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FAQ) => void;
  initialData?: FAQ;
}

export const FAQForm: React.FC<FAQFormProps> = ({ open, onOpenChange, onSave, initialData }) => {
  const [form, setForm] = useState<FAQ>({ question: '', answer: '', category: '', updatedBy: '', goal: '' });

  useEffect(() => {
    setForm(initialData || { question: '', answer: '', category: '', updatedBy: '', goal: '' });
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, id: initialData?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Question" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} required />
          <Textarea placeholder="Answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} required />
          <Input placeholder="Category/Tag" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
          <Input placeholder="Last Updated By" value={form.updatedBy} onChange={e => setForm({ ...form, updatedBy: e.target.value })} required />
          <Input placeholder="Goal" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

