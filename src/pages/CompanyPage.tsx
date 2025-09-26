// Simplified Company Page - best practices implementation
import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { Lock, AlertCircle, Shield, Users, Settings, RefreshCw, HelpCircle } from 'lucide-react';
import { CompanyUserManager } from '@/components/admin/CompanyUserManager';
import { CompanyMembersList } from '@/components/admin/CompanyMembersList';
import Header from '@/components/Header';
import AccessDenied from './AccessDenied';
import { generateSlug } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanySettings {
  description?: string;
  website?: string;
  industry?: string;
  phone?: string;
  address?: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  settings: CompanySettings;
  created_at: string;
  updated_at: string;
}

interface CompanyFaq {
  id: string;
  question: string;
  answer: string;
  updated_at?: string | null;
}

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, userRole, companies } = useAuth();
  const { hasRoleForCompany, isMemberOfCompany, isAdminOfCompany } = usePermissions();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdminSimulating, setIsAdminSimulating] = useState(false);
  const [faqs, setFaqs] = useState<CompanyFaq[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [openFaqs, setOpenFaqs] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    phone: '',
    address: ''
  });

  const loadFaqs = useCallback(async (companyId: string) => {
    setFaqLoading(true);
    setFaqError(null);

    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('id, question, answer, updated_at, faq_companies!inner(company_id)')
        .eq('faq_companies.company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const sanitizedFaqs: CompanyFaq[] = (data || []).map((faq: any) => ({
        id: faq.id,
        question: faq.question || 'Untitled question',
        answer: faq.answer || 'No answer provided yet.',
        updated_at: faq.updated_at ?? null
      }));

      setFaqs(sanitizedFaqs);
      setOpenFaqs(prev => prev.filter(id => sanitizedFaqs.some(faq => faq.id === id)));
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      setFaqError(err instanceof Error ? err.message : 'Failed to load FAQs');
      setFaqs([]);
      setOpenFaqs([]);
    } finally {
      setFaqLoading(false);
    }
  }, []);

  const fetchCompany = useCallback(async (showFullLoading = false): Promise<Company | null> => {
    if (!user || !slug) return null;

    if (showFullLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    let foundCompany: Company | null = null;

    try {
      setError(null);
      setIsAdminSimulating(false);

      const userCompany = companies.find(c => c.slug === slug);

      if (userCompany) {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userCompany.id)
          .single();

        if (error) throw error;
        foundCompany = data as Company;
      } else if (userRole === 'Admin') {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('slug', slug)
            .single();

          if (!error && data) {
            foundCompany = data as Company;
            setIsAdminSimulating(true);
          }
        } catch (err) {
          console.error('Failed to fetch company for admin:', err);
        }
      }

      if (foundCompany) {
        setCompany(foundCompany);
      } else {
        setCompany(null);
        setError('Access denied to this company');
      }
    } catch (err) {
      console.error('Error initializing company:', err);
      setError('Failed to load company');
    } finally {
      if (showFullLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }

    return foundCompany;
  }, [user, slug, companies, userRole]);

  useEffect(() => {
    fetchCompany(true);
  }, [fetchCompany]);

  const handleRefresh = async () => {
    const refreshedCompany = await fetchCompany(false);
    const companyIdToRefresh = refreshedCompany?.id || company?.id;

    if (companyIdToRefresh) {
      loadFaqs(companyIdToRefresh);
    }
  };

  // Update form data when company loads
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        description: company.settings?.description || '',
        website: company.settings?.website || '',
        industry: company.settings?.industry || '',
        phone: company.settings?.phone || '',
        address: company.settings?.address || ''
      });
    }
  }, [company]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!company) return;

    try {
      setSaving(true);

      const updates: any = {
        name: formData.name,
        settings: {
          description: formData.description,
          website: formData.website,
          industry: formData.industry,
          phone: formData.phone,
          address: formData.address
        }
      };

      // Update slug if name changed
      if (formData.name !== company.name) {
        updates.slug = generateSlug(formData.name);
      }

      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id);

      if (error) throw error;

      // Update local state
      setCompany(prev => prev ? { ...prev, ...updates } : null);
      setEditing(false);
      toast.success('Company settings updated successfully');
    } catch (error) {
      console.error('Failed to update company:', error);
      toast.error('Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        name: company.name || '',
        description: company.settings?.description || '',
        website: company.settings?.website || '',
        industry: company.settings?.industry || '',
        phone: company.settings?.phone || '',
        address: company.settings?.address || ''
      });
    }
    setEditing(false);
  };

  // Load FAQs when the company context changes
  useEffect(() => {
    if (!company?.id) {
      setFaqs([]);
      setOpenFaqs([]);
      setFaqError(null);
      return;
    }

    loadFaqs(company.id);
  }, [company?.id, loadFaqs]);

  // Check access and edit permissions
  const hasAccess = company?.id && (userRole === 'Admin' || isMemberOfCompany(company.id));
  const canEdit = company?.id && (userRole === 'Admin' || isAdminOfCompany(company.id));
  const isCompanyMember = company?.id && isMemberOfCompany(company.id) && !isAdminOfCompany(company.id) && userRole !== 'Admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <LoadingSpinner />
            <p className="text-muted-foreground">Loading company settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hasAccess || !company) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-20">
      <Header />

      <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your company information and preferences
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="w-full justify-center sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link to={`/${company.slug}`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full justify-center sm:w-auto">
                  Back to Portal
                </Button>
              </Link>
            </div>
          </div>

          {/* Permission Alert for Company Members */}
          {isCompanyMember && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Read-only access:</strong> You're viewing company settings as a member. 
                Only company administrators can edit these settings. Contact a company admin to make changes.
              </AlertDescription>
            </Alert>
          )}

          {/* Admin Simulation Alert */}
          {isAdminSimulating && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Admin Simulation Mode:</strong> You're viewing company settings as an administrator. 
                You have full access to edit settings for <strong>{company.name}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Company Settings Tabs */}
          <Tabs defaultValue="information" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="information" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Company Information
              </TabsTrigger>
              {canEdit && (
                <TabsTrigger value="user-management" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </TabsTrigger>
              )}
              <TabsTrigger value="team-members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="information" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Basic information about your company
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!editing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        disabled={!editing}
                        placeholder="e.g., Technology, Healthcare"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={!editing}
                      placeholder="Brief description of your company"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        disabled={!editing}
                        placeholder="https://www.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!editing}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!editing}
                      placeholder="Company address"
                      rows={2}
                    />
                  </div>

                  {/* Action Buttons - Only show if user can edit */}
                  {canEdit && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      {!editing ? (
                        <Button onClick={() => setEditing(true)}>
                          Edit Information
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button variant="outline" onClick={handleCancel} disabled={saving}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Read-only message for non-admin clients */}
                  {isCompanyMember && (
                    <Alert className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <strong>Company Member Access:</strong> You can view all company information but editing is restricted to company administrators. 
                        If you need to make changes, please contact a company admin.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab - Only for Company Admins */}
            {canEdit && (
              <TabsContent value="user-management">
                <CompanyUserManager 
                  companyId={company.id} 
                  companyName={company.name} 
                />
              </TabsContent>
            )}

            {/* Team Members Tab - For all company members */}
            <TabsContent value="team-members">
              <CompanyMembersList 
                companyId={company.id} 
                companyName={company.name} 
              />
            </TabsContent>
          </Tabs>

          {/* System Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Read-only system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Company ID</Label>
                  <p className="text-sm text-foreground font-mono">{company.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">URL Slug</Label>
                  <p className="text-sm text-foreground font-mono">{company.slug}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm text-foreground">
                    {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p className="text-sm text-foreground">
                    {new Date(company.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
            <CardHeader className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Answers curated in the admin dashboard and shared with your company.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : faqError ? (
                <Alert variant="destructive" className="border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to load FAQs right now. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              ) : faqs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-primary/30 bg-background/60 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Your administrator hasn&apos;t shared any FAQs yet. Check back soon for quick answers tailored to your team.
                  </p>
                </div>
              ) : (
                <Accordion
                  type="multiple"
                  value={openFaqs}
                  onValueChange={value => setOpenFaqs(Array.isArray(value) ? value : [value])}
                  className="space-y-3"
                >
                  {faqs.map(faq => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="overflow-hidden rounded-xl border border-border/60 bg-background/80 px-4"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <HelpCircle className="h-4 w-4" />
                          </span>
                          <span className="flex-1 leading-snug">{faq.question}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-12 text-sm leading-relaxed text-muted-foreground">
                          {faq.answer}
                          {faq.updated_at && (
                            <p className="mt-4 text-xs text-muted-foreground/80">
                              Updated {new Date(faq.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}