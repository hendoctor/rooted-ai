import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoadingIcon } from '@/components/LoadingSpinner';
import PortalContentManager from '@/components/admin/PortalContentManager';
import UnifiedUserManager from '@/components/admin/UnifiedUserManager';
import AdminPermissionDebugger from '@/components/admin/AdminPermissionDebugger';
import { activityLogger } from '@/utils/activityLogger';
import AccessDenied from './AccessDenied';
import ActivityLogsTable from '@/components/admin/ActivityLogsTable';
import AdminPortalPreview from '@/components/admin/AdminPortalPreview';

interface CompanyWithCount {
  id: string;
  name: string;
  slug: string;
  userCount: number;
}

const AdminDashboard: React.FC = () => {
  const { user, loading, userRole } = useAuth();
  const isAdmin = userRole === 'Admin';
  
  const [allCompanies, setAllCompanies] = useState<CompanyWithCount[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithCount | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', slug: '' });
  const [isCompanyUsersDialogOpen, setIsCompanyUsersDialogOpen] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [userToAdd, setUserToAdd] = useState('');
  const { toast } = useToast();

  // Enhanced data loading with auth state handling
  useEffect(() => {
    console.log('📊 AdminDashboard effect:', { loading, user: !!user, isAdmin, userRole });

    // Still loading auth state - wait
    if (loading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    // Auth loaded but no user - no need to fetch data
    if (!user) {
      console.log('❌ No user found after auth load');
      return;
    }

    // User exists but not admin - no need to fetch data
    if (!isAdmin) {
      console.log('❌ User is not admin, role:', userRole);
      return;
    }

    // Admin authenticated - fetch data
    console.log('✅ Admin authenticated, fetching data...');
    setLoadingData(true);
    fetchAllData();
    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupRealtimeSubscriptions();
    } catch (err) {
      console.warn('Realtime unavailable, continuing without live updates:', err);
    }

    // Log admin dashboard access
    if (user?.id && user?.email) {
      activityLogger.logPageView(user.id, user.email, 'Admin Dashboard').catch(console.error);
    }

    return cleanup;
  }, [user, loading, isAdmin, userRole]);

  // Unified loading state - show loading only if auth is loading OR we're fetching data
  const showLoading = loading || loadingData;

  // Show loading screen for any loading state
  if (showLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <LoadingIcon size="lg" />
            <p className="text-muted-foreground">
              {loading ? 'Authenticating admin access...' : 'Loading dashboard data...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show access denied only after auth is complete
  if (!user || !isAdmin) {
    return <AccessDenied />;
  }

  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all admin data...');
      
      await Promise.all([
        fetchAllCompanies()
      ]);
      
      console.log('✅ All admin data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to fetch admin data:', error);
      toast({
        title: "Loading Error",
        description: "Some data failed to load. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAllCompanies = async () => {
    try {
      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name', { ascending: true });
      
      if (companiesError || !companiesData) {
        console.error('Error fetching companies:', companiesError);
        toast({
          title: "Error",
          description: "Failed to fetch companies. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const { count, error } = await supabase
            .from('company_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          
          return {
            id: company.id,
            name: company.name,
            slug: company.slug,
            userCount: error ? 0 : (count || 0)
          };
        })
      );
      
      setAllCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error in fetchAllCompanies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openCompanyDialog = (company?: CompanyWithCount) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({ name: company.name, slug: company.slug });
    } else {
      setEditingCompany(null);
      setCompanyForm({ name: '', slug: '' });
    }
    setIsCompanyDialogOpen(true);
  };

  const openCompanyUsersDialog = (company: CompanyWithCount) => {
    setSelectedCompanyName(company.name);
    setSelectedCompanyId(company.id);
    setUserToAdd('');
    setIsCompanyUsersDialogOpen(true);
  };

  const saveCompany = async () => {
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({ name: companyForm.name, slug: companyForm.slug })
          .eq('id', editingCompany.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Company updated successfully' });
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({ name: companyForm.name, slug: companyForm.slug });
        if (error) throw error;
        toast({ title: 'Success', description: 'Company created successfully' });
      }
      setIsCompanyDialogOpen(false);
      setEditingCompany(null);
      setCompanyForm({ name: '', slug: '' });
      fetchAllCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      toast({ title: 'Error', description: 'Failed to save company', variant: 'destructive' });
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Company deleted' });
      fetchAllCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: 'Error', description: 'Failed to delete company', variant: 'destructive' });
    }
  };

  const setupRealtimeSubscriptions = () => {
    const adminChannel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        fetchAllCompanies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_memberships' }, () => {
        fetchAllCompanies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8 mt-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive management interface for users, companies, invitations, and settings.
          </p>
        </div>

        {/* Company Portals Section */}
        <AdminPortalPreview 
          onAddCompany={() => openCompanyDialog()}
          onEditCompany={(company) => openCompanyDialog({ id: company.id, name: company.name, slug: company.slug, userCount: 0 })}
          onDeleteCompany={deleteCompany}
          onManageUsers={openCompanyUsersDialog}
        />

        {/* Unified User Management */}
        <UnifiedUserManager companies={allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug }))} />

        {/* Portal Content Management */}
        <PortalContentManager companies={allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug }))} />

        {/* Activity Logs */}
        <ActivityLogsTable />

        {/* Permission Debugger */}
        <AdminPermissionDebugger />

        {/* Company Dialog */}
        <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
              <DialogDescription>
                {editingCompany ? 'Update company information' : 'Create a new company profile'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="company-slug">Company Slug</Label>
                <Input
                  id="company-slug"
                  value={companyForm.slug}
                  onChange={(e) => setCompanyForm({ ...companyForm, slug: e.target.value })}
                  placeholder="company-slug"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveCompany}>
                {editingCompany ? 'Update' : 'Create'} Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;