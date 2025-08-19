import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthReliable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';

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
  const { user, userRole, companies, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (!authLoading && user && slug) {
      fetchCompany();
    }
  }, [user, authLoading, slug]);

  const fetchCompany = async () => {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        toast.error('Company not found');
        return;
      }

      // Type assertion to handle JSON type from Supabase
      const companyData = {
        ...company,
        settings: (company.settings as CompanySettings) || {}
      };
      
      // Check access permissions
      const canAccess = checkCompanyAccess(companyData.id);
      setHasAccess(canAccess);
      
      if (canAccess) {
        setCompany(companyData);
        setFormData({
          name: companyData.name || '',
          description: companyData.settings.description || '',
          website: companyData.settings.website || '',
          industry: companyData.settings.industry || '',
          phone: companyData.settings.phone || '',
          address: companyData.settings.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const checkCompanyAccess = (companyId: string): boolean => {
    // Admin has access to all companies
    if (userRole === 'Admin') return true;
    
    // Check if user is a member of this company
    return companies.some(c => c.id === companyId);
  };

  const handleSave = async () => {
    if (!company) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          settings: {
            description: formData.description,
            website: formData.website,
            industry: formData.industry,
            phone: formData.phone,
            address: formData.address
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Company details updated successfully');
      setEditing(false);
      fetchCompany(); // Refresh data
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company details');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Company Not Found</CardTitle>
            <CardDescription>
              The company you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground">Company Dashboard</p>
            </div>
            <Button 
              onClick={() => editing ? handleSave() : setEditing(true)}
              variant={editing ? "default" : "outline"}
            >
              {editing ? 'Save Changes' : 'Edit Details'}
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Manage your company details and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!editing}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!editing}
                    placeholder="Tell us about your company..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!editing}
                      placeholder="https://company.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      disabled={!editing}
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!editing}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!editing}
                      placeholder="Company address"
                    />
                  </div>
                </div>

                {editing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave}>Save Changes</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditing(false);
                        // Reset form data
                        setFormData({
                          name: company.name || '',
                          description: company.settings?.description || '',
                          website: company.settings?.website || '',
                          industry: company.settings?.industry || '',
                          phone: company.settings?.phone || '',
                          address: company.settings?.address || ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>
                  Additional configuration options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Company ID:</strong> {company.id}</p>
                  <p><strong>Company Slug:</strong> {company.slug}</p>
                  <p><strong>Created:</strong> {new Date(company.created_at).toLocaleDateString()}</p>
                  <p><strong>Last Updated:</strong> {new Date(company.updated_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}