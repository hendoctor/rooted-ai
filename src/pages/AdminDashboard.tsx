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
import { Trash2, Edit2, Users, Building2, Crown, UserPlus, X, ExternalLink, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoadingSpinner, InlineLoader, LoadingIcon } from '@/components/LoadingSpinner';
import PortalContentManager from '@/components/admin/PortalContentManager';
import UserInvitationManager from '@/components/admin/UserInvitationManager';
import AdminPermissionDebugger from '@/components/admin/AdminPermissionDebugger';
import { activityLogger } from '@/utils/activityLogger';
import { Link } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import ActivityLogsTable from '@/components/admin/ActivityLogsTable';
import AdminPortalPreview from '@/components/admin/AdminPortalPreview';

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
  const [loadingData, setLoadingData] = useState(false);
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

  const handleRefreshUsers = () => {
    fetchUsersWithRoles();
    toast({
      title: 'Users refreshed',
      description: 'Latest users loaded',
    });
  };

  const handleRefreshSubscriptions = () => {
    fetchNewsletterSubscriptions();
    toast({
      title: 'Subscriptions refreshed',
      description: 'Latest subscriptions loaded',
    });
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

  const deleteUser = async (userEmail: string) => {
    // Show comprehensive confirmation dialog
    const confirmed = window.confirm(
      `⚠️ PERMANENT ACTION ⚠️\n\nThis will completely delete user "${userEmail}" and:\n\n• Revoke all active sessions immediately\n• Delete all user data and company memberships\n• Cancel any pending invitations\n• Remove activity logs and anonymize audit trails\n• This action CANNOT be undone\n\nAre you absolutely sure you want to proceed?`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      toast({
        title: "Deleting user...",
        description: "Revoking sessions and cleaning up data",
      });

      // Call the enhanced edge function that handles session revocation and complete cleanup
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userEmail }
      });
      
      if (error) {
        console.error('User deletion failed:', error);
        toast({
          title: "Deletion Failed", 
          description: error.message || "Failed to delete user completely",
          variant: "destructive"
        });
        return;
      }

      // Log admin action
      if (user?.id && user?.email) {
        await activityLogger.logAdminAction(
          user.id,
          user.email,
          'delete_user_complete',
          { 
            deletedUserEmail: userEmail,
            sessionsRevoked: data?.sessionsRevoked,
            authDeleted: data?.authDeleted,
            cleanupSummary: data?.databaseCleanup?.cleanup_summary
          }
        );
      }
      
      toast({
        title: "Success",
        description: `User ${userEmail} has been completely deleted and all sessions revoked`,
      });
      fetchUsersWithRoles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditForm({
      display_name: user.display_name || '',
      client_name: user.client_name || '',
      role: user.role,
      companyId: user.companies?.[0]?.id || 'none',
      companyRole: (user.companies?.[0]?.userRole as 'Member' | 'Admin') || 'Member'
    });
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name,
          client_name: editForm.client_name,
          role: editForm.role
        })
        .eq('auth_user_id', editingUser.auth_user_id);

      if (error) throw error;

      toast({ title: 'Success', description: 'User updated successfully' });
      setEditingUser(null);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    }
  };

  const createMissingProfile = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: user.email.split('@')[0] })
        .eq('auth_user_id', user.auth_user_id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Profile created' });
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({ title: 'Error', description: 'Failed to create profile', variant: 'destructive' });
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
      toast({ title: 'Success', description: 'User removed from company' });
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing user from company:', error);
      toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' });
    }
  };

  const toggleNewsletterSubscription = async (subscription: NewsletterSubscription) => {
    try {
      const newStatus = subscription.status === 'active' ? 'unsubscribed' : 'active';
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'unsubscribed') {
        updateData.unsubscribed_at = new Date().toISOString();
      } else {
        updateData.unsubscribed_at = null;
      }

      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (error) throw error;
      toast({ title: 'Success', description: `Subscription ${newStatus}` });
      fetchNewsletterSubscriptions();
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
                  variant="destructive"
                  size="sm"
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
            variant="destructive"
            size="sm"
            onClick={() => deleteNewsletterSubscription(s.id)}
          >
            <Trash2 className="h-3 w-3" />
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
        <AdminPortalPreview 
          onAddCompany={() => openCompanyDialog()}
          onEditCompany={(company) => openCompanyDialog({ id: company.id, name: company.name, slug: company.slug, userCount: 0 })}
          onDeleteCompany={deleteCompany}
          onManageUsers={openCompanyUsersDialog}
        />

        {/* User Management Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions. Click delete to completely remove a user and revoke all sessions.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleRefreshUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <SortableTable
              data={usersWithRoles}
              columns={userColumns}
            />
          </CardContent>
        </Card>

        {/* Newsletter Management */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Newsletter Subscriptions
              </CardTitle>
              <CardDescription>
                Manage email subscriptions and communication preferences
              </CardDescription>
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleRefreshSubscriptions}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="default"
                className="w-full sm:w-auto"
                onClick={openNewsletterDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subscriber
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SortableTable
              data={newsletterSubscriptions}
              columns={newsletterColumns}
            />
          </CardContent>
        </Card>

        {/* User Invitation Management */}
        <UserInvitationManager companies={allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug }))} />

        {/* Portal Content Management */}
        <PortalContentManager companies={allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug }))} />

        {/* Activity Logs */}
        <ActivityLogsTable />

        {/* Permission Debugger */}
        <AdminPermissionDebugger />

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value as 'Client' | 'Admin' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={saveUserChanges}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Company Dialog */}
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

        {/* Newsletter Dialog */}
        <Dialog open={isNewsletterDialogOpen} onOpenChange={setIsNewsletterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Newsletter Subscriber</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newsletter-email">Email</Label>
                <Input
                  id="newsletter-email"
                  type="email"
                  value={newsletterForm.email}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewsletterDialogOpen(false)}>Cancel</Button>
              <Button onClick={addNewsletterSubscription}>Add Subscriber</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;