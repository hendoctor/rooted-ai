import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SortableTable, { Column } from '@/components/admin/SortableTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit2, Users, Building2, Crown, UserPlus, X, ExternalLink, MessageSquare, Plus, RefreshCw, Pencil, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoadingSpinner, InlineLoader } from '@/components/LoadingSpinner';
import PortalContentManager from '@/components/admin/PortalContentManager';
import AdminPermissionDebugger from '@/components/admin/AdminPermissionDebugger';
import { activityLogger } from '@/utils/activityLogger';
import { Link } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import ActivityLogsTable from '@/components/admin/ActivityLogsTable';
import AdminPortalPreview from '@/components/admin/AdminPortalPreview';
import { format } from 'date-fns';

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

interface Invitation {
  id: string;
  email: string;
  full_name: string;
  client_name: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  invitation_token: string;
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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditInviteDialogOpen, setIsEditInviteDialogOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'Client', companyId: '' });
  const [editInviteForm, setEditInviteForm] = useState({ email: '', full_name: '', role: 'Client', companyId: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
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
    setLoadingData(true); // Set loading only when we start fetching
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

  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all admin data...');
      
      await Promise.all([
        fetchUsersWithRoles(),
        fetchAllCompanies(),
        fetchNewsletterSubscriptions(),
        fetchInvitations()
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

  const fetchInvitations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as Invitation[]) ?? []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive'
      });
    }
  }, [toast]);
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

  const handleRefreshUsers = () => {
    fetchUsersWithRoles();
    fetchInvitations();
    toast({
      title: 'Users refreshed',
      description: 'Latest users and invitations loaded',
    });
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let clientName = '';
      if (inviteForm.role === 'Admin') {
        clientName = 'RootedAI';
      } else {
        const selectedCompany = allCompanies.find(c => c.id === inviteForm.companyId);
        if (!selectedCompany) throw new Error('Please select a company');
        clientName = selectedCompany.name;
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          role: inviteForm.role,
          client_name: clientName
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Invitation Sent!',
        description: `Successfully sent invitation to ${inviteForm.email}`,
      });

      setInviteForm({ email: '', full_name: '', role: 'Client', companyId: '' });
      setIsInviteDialogOpen(false);
      fetchInvitations();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      let description = 'Failed to send invitation';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('rate limit')) {
        description = 'Rate limit exceeded. Please wait before sending more invitations.';
      } else if (message) {
        description = message;
      }
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation cancelled successfully',
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive'
      });
    }
  };

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: 'Copied!',
      description: 'Invitation link copied to clipboard',
    });
  };

  const handleEditInvitation = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    let companyId = '';
    if (invitation.role === 'Client' && invitation.client_name) {
      const company = allCompanies.find(c => c.name === invitation.client_name);
      if (company) companyId = company.id;
    }
    setEditInviteForm({
      email: invitation.email,
      full_name: invitation.full_name,
      role: invitation.role,
      companyId
    });
    setIsEditInviteDialogOpen(true);
  };

  const updateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvitation) return;
    try {
      let clientName = '';
      if (editInviteForm.role === 'Admin') {
        clientName = 'RootedAI';
      } else {
        const selectedCompany = allCompanies.find(c => c.id === editInviteForm.companyId);
        if (!selectedCompany) throw new Error('Please select a company');
        clientName = selectedCompany.name;
      }

      const { error } = await supabase
        .from('user_invitations')
        .update({
          email: editInviteForm.email,
          full_name: editInviteForm.full_name,
          role: editInviteForm.role,
          client_name: clientName,
        })
        .eq('id', editingInvitation.id);

      if (error) throw error;

      toast({
        title: 'Invitation Updated',
        description: 'Invitation updated successfully',
      });

      setIsEditInviteDialogOpen(false);
      setEditingInvitation(null);
      fetchInvitations();
    } catch (error) {
      console.error('Error updating invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invitation',
        variant: 'destructive',
      });
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Invitation deleted successfully',
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invitation',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (status === 'pending' && isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'accepted':
        return <Badge variant="default">Accepted</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_invitations' }, () => {
        fetchInvitations();
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

  interface UserRow extends UserWithRole {
    kind: 'user';
    name: string;
  }

  interface InvitationRow extends Invitation {
    kind: 'invitation';
    name: string;
  }

  const userTableData: (UserRow | InvitationRow)[] = [
    ...usersWithRoles.map(u => ({ ...u, kind: 'user' as const, name: u.display_name || u.email })),
    ...invitations.map(inv => ({ ...inv, kind: 'invitation' as const, name: inv.full_name || inv.email }))
  ];

  const userColumns: Column<UserRow | InvitationRow>[] = [
    { key: 'email', label: 'Email', initialWidth: 200 },
    {
      key: 'role',
      label: 'Role',
      render: (item) => (
        <Badge variant={item.role === 'Admin' ? 'default' : 'secondary'}>
          {item.role === 'Admin' && <Crown className="h-3 w-3 mr-1" />}
          {item.role}
        </Badge>
      ),
      initialWidth: 120,
    },
    { key: 'name', label: 'Name', initialWidth: 150 },
    {
      key: 'companyOrStatus',
      label: 'Company / Status',
      sortable: false,
      render: (item) =>
        item.kind === 'user'
          ? item.companies && item.companies.length > 0
            ? (
                <div className="space-y-1">
                  {item.companies.map((company, idx) => (
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
                        onClick={() => removeUserFromCompany(item.auth_user_id, company.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            : (
                <span className="text-muted-foreground">{item.client_name || 'No company'}</span>
              )
          : getStatusBadge(item.status, item.expires_at),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (item) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {format(new Date(item.created_at), 'MMM dd, yyyy')}
        </div>
      ),
      initialWidth: 150,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) =>
        item.kind === 'user' ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditUser(item)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            {!item.display_name && (
              <Button variant="outline" size="sm" onClick={() => createMissingProfile(item)}>
                <UserPlus className="h-3 w-3" />
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => deleteUser(item.email)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => handleEditInvitation(item)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => deleteInvitation(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
            {item.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => copyInvitationLink(item.invitation_token)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => cancelInvitation(item.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ),
      initialWidth: 180,
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

        {/* Company Portals Section - Now handled by AdminPortalPreview */}
        <AdminPortalPreview 
          onAddCompany={() => openCompanyDialog()}
          onEditCompany={(company) => openCompanyDialog({ id: company.id, name: company.name, slug: company.slug, userCount: 0 })}
          onDeleteCompany={deleteCompany}
          onManageUsers={openCompanyUsersDialog}
        />

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-forest-green">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Real-time view of all authenticated user profiles with full management capabilities.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
                <Button onClick={handleRefreshUsers} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading users..." />
            ) : userTableData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users or invitations found.</p>
            ) : (
              <SortableTable data={userTableData} columns={userColumns} />
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

        {/* Invite User Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>Send an invitation to a new user.</DialogDescription>
            </DialogHeader>
            <form onSubmit={sendInvitation} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-name">Full Name</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteForm.role === 'Client' && (
                <div className="grid gap-2">
                  <Label htmlFor="invite-company">Company</Label>
                  <Select
                    value={inviteForm.companyId}
                    onValueChange={(value) => setInviteForm({ ...inviteForm, companyId: value })}
                  >
                    <SelectTrigger id="invite-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteLoading}>
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Invitation Dialog */}
        <Dialog open={isEditInviteDialogOpen} onOpenChange={setIsEditInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Invitation</DialogTitle>
              <DialogDescription>Update invitation details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={updateInvitation} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-invite-email">Email</Label>
                <Input
                  id="edit-invite-email"
                  type="email"
                  value={editInviteForm.email}
                  onChange={(e) => setEditInviteForm({ ...editInviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-invite-name">Full Name</Label>
                <Input
                  id="edit-invite-name"
                  value={editInviteForm.full_name}
                  onChange={(e) => setEditInviteForm({ ...editInviteForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-invite-role">Role</Label>
                <Select
                  value={editInviteForm.role}
                  onValueChange={(value) => setEditInviteForm({ ...editInviteForm, role: value })}
                >
                  <SelectTrigger id="edit-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editInviteForm.role === 'Client' && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-invite-company">Company</Label>
                  <Select
                    value={editInviteForm.companyId}
                    onValueChange={(value) => setEditInviteForm({ ...editInviteForm, companyId: value })}
                  >
                    <SelectTrigger id="edit-invite-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditInviteDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Update Invitation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Activity Logs Section */}
        <ActivityLogsTable />

        {/* Newsletter Subscriptions Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-forest-green">
                  <MessageSquare className="h-5 w-5" />
                  Newsletter Subscriptions
                </CardTitle>
                <CardDescription>
                  Manage newsletter subscriptions and subscriber status.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={openNewsletterDialog}
                  className="bg-forest-green hover:bg-forest-green/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Subscriber
                </Button>
                <Button onClick={handleRefreshSubscriptions} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
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

        <PortalContentManager companies={allCompanies} currentAdmin={user?.email || ""} />
        
        <AdminPermissionDebugger />
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
