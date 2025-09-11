// Simplified Company Page - best practices implementation
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import Header from '@/components/Header';
import AccessDenied from './AccessDenied';
import { generateSlug } from '@/lib/utils';

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

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, userRole, companies } = useAuth();
  const { hasRoleForCompany } = usePermissions();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    phone: '',
    address: ''
  });

  // Initialize company data
  useEffect(() => {
    const initializeCompany = async () => {
      if (!user || !slug) return;

      try {
        setLoading(true);
        setError(null);

        // Find company from user's companies first
        const userCompany = companies.find(c => c.slug === slug);
        
        if (userCompany) {
          // Fetch full company data
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', userCompany.id)
            .single();

          if (error) throw error;
          setCompany(data as Company);
        } else if (userRole === 'Admin') {
          // Admin can access any company
          const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('slug', slug)
            .single();

          if (error) {
            console.error('Failed to fetch company:', error);
            setError('Company not found');
            return;
          }

          setCompany(data as Company);
        } else {
          setError('Access denied to this company');
          return;
        }
      } catch (err) {
        console.error('Error initializing company:', err);
        setError('Failed to load company');
      } finally {
        setLoading(false);
      }
    };

    initializeCompany();
  }, [user, userRole, companies, slug]);

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

  // Check access - Allow Admins and Clients to edit their own companies
  const hasAccess = hasRoleForCompany(['Admin', 'Client'], company?.id) || userRole === 'Admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
              <p className="text-muted-foreground mt-2">
                Manage your company information and preferences
              </p>
            </div>
            <Link to={`/${company.slug}`}>
              <Button variant="outline">
                Back to Portal
              </Button>
            </Link>
          </div>

          {/* Company Information Card */}
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

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
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
            </CardContent>
          </Card>

          {/* Company Metadata */}
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
        </div>
      </div>
    </div>
  );
}