import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SortableTable, { Column } from '@/components/admin/SortableTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit2, Users, Building2, Crown, UserPlus, X, ExternalLink, MessageSquare, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoadingSpinner, InlineLoader } from '@/components/LoadingSpinner';
import PortalContentManager from '@/components/admin/PortalContentManager';
import ClientInvitationManager from '@/components/admin/ClientInvitationManager';
import AdminInvitationManager from '@/components/admin/AdminInvitationManager';
import AdminPermissionDebugger from '@/components/admin/AdminPermissionDebugger';
import { activityLogger } from '@/utils/activityLogger';
import { Link } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import ActivityLogsTable from '@/components/admin/ActivityLogsTable';

interface UserWithRole {
  id: string;
  auth_user_id: string;
  email: string;
  role: 'Client' | 'Admin';
  client_name: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  companies?: Array<{
    id: string;
    name: string;
    slug: string;
    userRole: string;
  }>;
}

interface CompanyWithCount {
  id: string;
  name: string;
  slug: string;
  userCount: number;
}

interface NewsletterSubscription {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  created_at: string;
  updated_at: string;
  unsubscribed_at?: string;
  source: string;
}

const AdminDashboard: React.FC = () => {
  const { user, loading, userRole } = useAuth();
  const isAdmin = userRole === 'Admin';
  
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyWithCount[]>([]);
  const [newsletterSubscriptions, setNewsletterSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loadingData, setLoadingData] = useState(false); // Start as false, only set true when actually fetching
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    client_name: '',
    role: 'Client' as 'Client' | 'Admin',
    companyId: 'none',
    companyRole: 'Member' as 'Member' | 'Admin'
  });
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithCount | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', slug: '' });
  const [isNewsletterDialogOpen, setIsNewsletterDialogOpen] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({ email: '' });
  const [isCompanyUsersDialogOpen, setIsCompanyUsersDialogOpen] = useState(false);
  const [selectedCompanyUsers, setSelectedCompanyUsers] = useState<UserWithRole[]>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [userToAdd, setUserToAdd] = useState('');
  const { toast } = useToast();

  // Unified loading state - show loading only if auth is loading OR we're fetching data
  const showLoading = loading || loadingData;

  // Show loading screen for any loading state
  if (showLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 lg:pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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
    setLoadingData(true); // Set loading only when we start fetching
    fetchAllData();
    const cleanup = setupRealtimeSubscriptions();
    
    // Log admin dashboard access
    if (user?.id && user?.email) {
      activityLogger.logPageView(user.id, user.email, 'Admin Dashboard').catch(console.error);
    }
    
    return cleanup;
  }, [user, loading, isAdmin, userRole]);

  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all admin data...');
      
      await Promise.all([
        fetchUsersWithRoles(),
        fetchAllCompanies(),
        fetchNewsletterSubscriptions()
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

  const fetchUsersWithRoles = async () => {
    try {
      // Fetch users, memberships, and companies in parallel
      const [usersRes, membershipsRes, companiesRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, auth_user_id, email, role, client_name, display_name, created_at, updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('company_memberships')
          .select('user_id, company_id, role'),
        supabase
          .from('companies')
          .select('id, name, slug')
      ]);

      const usersError = usersRes.error;
      const membershipsError = membershipsRes.error;
      const companiesError = companiesRes.error;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }
      if (membershipsError) {
        console.error('Error fetching company memberships:', membershipsError);
      }
      if (companiesError) {
        console.error('Error fetching companies (for mapping):', companiesError);
      }

      const usersData = usersRes.data || [];
      const membershipsData = membershipsRes.data || [];
      const companiesData = companiesRes.data || [];

      // Build a quick lookup for companies by id
      const companyById = new Map(
        companiesData.map((c: { id: string; name: string; slug: string }) => [
          c.id,
          { id: c.id, name: c.name, slug: c.slug }
        ])
      );

      // Group memberships by user_id and attach company details
      const companiesByUser = new Map<string, Array<{ id: string; name: string; slug: string; userRole: string }>>();
      for (const m of membershipsData) {
        const comp = companyById.get(m.company_id);
        if (!comp) continue;
        const list = companiesByUser.get(m.user_id) || [];
        list.push({ ...comp, userRole: m.role });
        companiesByUser.set(m.user_id, list);
      }

      // Type-cast the role and attach companies to each user
      interface DBUser {
        id: string;
        auth_user_id: string;
        email: string;
        role: string;
        client_name: string | null;
        display_name: string | null;
        created_at: string;
        updated_at: string;
      }

      const typedUsers: UserWithRole[] = usersData.map((u: DBUser) => ({
        ...u,
        role: u.role as 'Client' | 'Admin',
        client_name: u.client_name || 'N/A',
        companies: companiesByUser.get(u.auth_user_id) || []
      }));

      setUsersWithRoles(typedUsers);
    } catch (error) {
      console.error('Error in fetchUsersWithRoles:', error);
    }
  };
  // Role permissions are now managed directly in users table - no separate fetch needed

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

  const fetchNewsletterSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const typedSubscriptions: NewsletterSubscription[] = data.map(sub => ({
          ...sub,
          status: sub.status as 'active' | 'unsubscribed'
        }));
        setNewsletterSubscriptions(typedSubscriptions);
      }
    } catch (error) {
      console.error('Error fetching newsletter subscriptions:', error);
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
    const usersForCompany = usersWithRoles.filter((u) =>
      u.companies?.some((c) => c.id === company.id)
    );
    setSelectedCompanyUsers(usersForCompany);
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

  const openNewsletterDialog = () => {
    setNewsletterForm({ email: '' });
    setIsNewsletterDialogOpen(true);
  };

  const addNewsletterSubscription = async () => {
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({ email: newsletterForm.email, status: 'active', source: 'admin' });
      if (error) throw error;
      toast({ title: 'Success', description: 'Subscriber added' });
      setIsNewsletterDialogOpen(false);
      setNewsletterForm({ email: '' });
      fetchNewsletterSubscriptions();
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast({ title: 'Error', description: 'Failed to add subscriber', variant: 'destructive' });
    }
  };

  const deleteNewsletterSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Subscription deleted' });
      fetchNewsletterSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({ title: 'Error', description: 'Failed to delete subscription', variant: 'destructive' });
    }
  };

  const setupRealtimeSubscriptions = () => {
    const adminChannel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsersWithRoles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        fetchAllCompanies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_memberships' }, () => {
        fetchUsersWithRoles();
        fetchAllCompanies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'newsletter_subscriptions' }, () => {
        fetchNewsletterSubscriptions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  };

  const updateUserRole = async (userEmail: string, newRole: 'Client' | 'Admin') => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('email', userEmail);
    
    if (!error) {
      // Log admin action
      if (user?.id && user?.email) {
        await activityLogger.logAdminAction(
          user.id,
          user.email,
          'update_user_role',
          { targetUserEmail: userEmail, newRole, oldRole: 'previous_role' }
        );
      }
      
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
      fetchUsersWithRoles();
    } else {
      toast({
        title: "Error", 
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  // Permission management is now handled directly through users.role field

  const deleteUser = async (userEmail: string) => {
    const { error } = await supabase.rpc('delete_user_completely', {
      user_email: userEmail
    });
    
    if (!error) {
      // Log admin action
      if (user?.id && user?.email) {
        await activityLogger.logAdminAction(
          user.id,
          user.email,
          'delete_user',
          { deletedUserEmail: userEmail }
        );
      }
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsersWithRoles();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    const primaryCompany = user.companies?.[0];
    setEditForm({
      display_name: user.display_name || '',
      client_name: user.client_name || '',
      role: user.role,
      companyId: primaryCompany?.id || 'none',
      companyRole: primaryCompany?.userRole as 'Member' | 'Admin' || 'Member'
    });
  };

  const createMissingProfile = async (user: UserWithRole) => {
    if (!user.display_name) {
      const defaultDisplayName = user.email.split('@')[0];
      
      const { error } = await supabase
        .from('users')
        .update({ display_name: defaultDisplayName })
        .eq('id', user.id);

      if (!error) {
        fetchUsersWithRoles();
        toast({
          title: "Profile Created",
          description: `Created profile for ${user.email} with display name: ${defaultDisplayName}`,
        });
      }
    }
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      // Update user info
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name,
          client_name: editForm.client_name,
          role: editForm.role
        })
        .eq('id', editingUser.id);

      if (userError) throw userError;

      // Update company membership if selected
      if (editForm.companyId && editForm.companyId !== 'none') {
        const { error: membershipError } = await supabase
          .from('company_memberships')
          .upsert(
            {
              user_id: editingUser.auth_user_id,
              company_id: editForm.companyId,
              role: editForm.companyRole
            },
            { onConflict: 'user_id,company_id' }
          );

        if (membershipError) throw membershipError;
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      });
      
      setEditingUser(null);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const removeUserFromCompany = async (userId: string, companyId: string) => {
    try {
      const { error } = await supabase
        .from('company_memberships')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from company"
      });

      setSelectedCompanyUsers((prev) =>
        prev.filter((u) => u.auth_user_id !== userId)
      );
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing user from company:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from company",
        variant: "destructive"
      });
    }
  };

  const addUserToCompany = async (userId: string, companyId: string) => {
    try {
      const { error } = await supabase.from('company_memberships').insert({
        user_id: userId,
        company_id: companyId,
        role: 'Member'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to company"
      });

      const addedUser = usersWithRoles.find((u) => u.auth_user_id === userId);
      if (addedUser) {
        setSelectedCompanyUsers((prev) => [...prev, addedUser]);
      }
      setUserToAdd('');
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error adding user to company:', error);
      toast({
        title: "Error",
        description: "Failed to add user to company",
        variant: "destructive"
      });
    }
  };

  const toggleNewsletterSubscription = async (subscription: NewsletterSubscription) => {
    try {
      const newStatus = subscription.status === 'active' ? 'unsubscribed' : 'active';
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'unsubscribed') {
        updateData.unsubscribed_at = new Date().toISOString();
      } else {
        updateData.unsubscribed_at = null;
      }

      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (!error) {
        toast({
          title: "Success",
          description: `Subscription ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
        });
        fetchNewsletterSubscriptions();
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error updating newsletter subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    }
  };

  const userColumns: Column<UserWithRole>[] = [
    { key: 'email', label: 'Email', initialWidth: 200 },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <Badge variant={u.role === 'Admin' ? 'default' : 'secondary'}>
          {u.role === 'Admin' && <Crown className="h-3 w-3 mr-1" />}
          {u.role}
        </Badge>
      ),
      initialWidth: 120,
    },
    { key: 'display_name', label: 'Display Name', initialWidth: 150 },
    {
      key: 'companies',
      label: 'Company Memberships',
      sortable: false,
      render: (user) =>
        user.companies && user.companies.length > 0 ? (
          <div className="space-y-1">
            {user.companies.map((company, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {company.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({company.userRole})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => removeUserFromCompany(user.auth_user_id, company.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{user.client_name || 'No company'}</span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (user) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
            <Edit2 className="h-3 w-3" />
          </Button>
          {!user.display_name && (
            <Button variant="outline" size="sm" onClick={() => createMissingProfile(user)}>
              <UserPlus className="h-3 w-3" />
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => deleteUser(user.email)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      initialWidth: 150,
    },
  ];

  const newsletterColumns: Column<NewsletterSubscription>[] = [
    {
      key: 'email',
      label: 'Email',
      initialWidth: 200,
      render: (s) => <span className="font-medium">{s.email}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => (
        <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
          {s.status}
        </Badge>
      ),
      initialWidth: 100,
    },
    { key: 'source', label: 'Source', initialWidth: 150 },
    {
      key: 'created_at',
      label: 'Subscribed',
      render: (s) => new Date(s.created_at).toLocaleDateString(),
      initialWidth: 120,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (s) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={s.status === 'active'}
            onCheckedChange={() => toggleNewsletterSubscription(s)}
          />
          <span className="text-sm">
            {s.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1"
            onClick={() => deleteNewsletterSubscription(s.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      initialWidth: 170,
    },
  ];

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
        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-forest-green">
              <Building2 className="h-5 w-5" />
              Company Portals
            </CardTitle>
            <CardDescription>
              Access and manage all registered company portals and their user counts.
            </CardDescription>
            <Button
              size="sm"
              onClick={() => openCompanyDialog()}
              className="bg-forest-green hover:bg-forest-green/90 mt-4 w-fit"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Company
            </Button>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading companies..." />
            ) : allCompanies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No companies found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allCompanies.map((company) => (
                  <Card key={company.id} className="border border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg break-words text-forest-green">
                        {company.name}
                      </CardTitle>
                      <CardDescription className="break-words">
                        /{company.slug}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {company.userCount} user{company.userCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full text-xs sm:text-sm"
                        >
                          <Link
                            to={`/${company.slug}`}
                            className="flex items-center justify-center"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Portal
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCompanyUsersDialog(company)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Users
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCompanyDialog(company)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCompany(company.id)}
                          className="w-full text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Company'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Name</Label>
                <Input
                  id="company-name"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company-slug">Slug</Label>
                <Input
                  id="company-slug"
                  value={companyForm.slug}
                  onChange={(e) => setCompanyForm({ ...companyForm, slug: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveCompany}>{editingCompany ? 'Save Changes' : 'Create Company'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isCompanyUsersDialogOpen}
          onOpenChange={(open) => {
            setIsCompanyUsersDialogOpen(open);
            if (!open) {
              setSelectedCompanyId(null);
              setSelectedCompanyUsers([]);
              setUserToAdd('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Users in {selectedCompanyName}</DialogTitle>
            </DialogHeader>
            {selectedCompanyUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users associated with this company.</p>
            ) : (
              <ul className="space-y-2">
                {selectedCompanyUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-2">
                    <Badge variant="secondary">{u.role}</Badge>
                    <span>{u.display_name || u.email}</span>
                    {selectedCompanyId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => removeUserFromCompany(u.auth_user_id, selectedCompanyId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2">
              <Label htmlFor="add-user">Add User</Label>
              <div className="flex items-center gap-2">
                <Select value={userToAdd} onValueChange={setUserToAdd}>
                  <SelectTrigger id="add-user" className="w-[200px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersWithRoles
                      .filter((u) =>
                        !selectedCompanyUsers.some((sc) => sc.id === u.id)
                      )
                      .map((u) => (
                        <SelectItem key={u.id} value={u.auth_user_id}>
                          {u.display_name || u.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    selectedCompanyId && userToAdd && addUserToCompany(userToAdd, selectedCompanyId)
                  }
                  disabled={!userToAdd}
                >
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-forest-green">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Real-time view of all authenticated user profiles with full management capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading users..." />
            ) : usersWithRoles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users found.</p>
            ) : (
              <SortableTable data={usersWithRoles} columns={userColumns} />
            )}
          </CardContent>
        </Card>

        {/* User Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and company assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="display_name" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client_name" className="text-right">
                  Client Name
                </Label>
                <Input
                  id="client_name"
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select value={editForm.role} onValueChange={(value: 'Client' | 'Admin') => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Select value={editForm.companyId} onValueChange={(value) => setEditForm({ ...editForm, companyId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {allCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyRole">Company Role</Label>
                  <Select value={editForm.companyRole} onValueChange={(value: 'Member' | 'Admin') => setEditForm({ ...editForm, companyRole: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={saveUserEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Logs Section */}
        <ActivityLogsTable />

        {/* Newsletter Subscriptions Section */}
        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 text-forest-green">
              <MessageSquare className="h-5 w-5" />
              Newsletter Subscriptions
            </CardTitle>
            <CardDescription>
              Manage newsletter subscriptions and subscriber status.
            </CardDescription>
            <Button
              size="sm"
              onClick={openNewsletterDialog}
              className="bg-forest-green hover:bg-forest-green/90 mt-4 w-fit"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Subscriber
            </Button>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading subscriptions..." />
            ) : newsletterSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No newsletter subscriptions found.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Total subscriptions: {newsletterSubscriptions.length} 
                    (Active: {newsletterSubscriptions.filter(s => s.status === 'active').length})
                  </p>
                </div>
                <SortableTable
                  data={newsletterSubscriptions}
                  columns={newsletterColumns}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isNewsletterDialogOpen} onOpenChange={setIsNewsletterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subscriber</DialogTitle>
              <DialogDescription>
                Manually add a new newsletter subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newsletter-email">Email</Label>
                <Input
                  id="newsletter-email"
                  type="email"
                  value={newsletterForm.email}
                  onChange={(e) => setNewsletterForm({ email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewsletterDialogOpen(false)}>Cancel</Button>
              <Button onClick={addNewsletterSubscription}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AdminInvitationManager />
        
        <ClientInvitationManager companies={allCompanies} />
        
        <PortalContentManager companies={allCompanies} currentAdmin={user?.email || ""} />
        
        <AdminPermissionDebugger />
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
