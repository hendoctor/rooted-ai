import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SortableTable, { Column } from './SortableTable';
import { 
  Users, 
  UserPlus, 
  Mail, 
  User, 
  Shield, 
  Building, 
  Plus, 
  RefreshCw, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  X, 
  Clock,
  Send,
  Bell,
  BellOff
} from 'lucide-react';
import { format } from 'date-fns';
import { activityLogger } from '@/utils/activityLogger';

export interface UnifiedUserRecord {
  id: string; // Required for SortableTable
  email: string;
  name: string;
  status: 'active' | 'pending' | 'expired' | 'newsletter_only' | 'unsubscribed' | 'cancelled' | 'accepted';
  role: 'Admin' | 'Client' | 'Newsletter';
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    userRole: string;
  }>;
  newsletter_status: 'active' | 'unsubscribed' | 'not_subscribed';
  newsletter_frequency?: string;
  registration_date: string;
  last_activity: string;
  source_table: 'users' | 'user_invitations' | 'newsletter_subscriptions';
  user_id?: string;
  invitation_id?: string;
  newsletter_id?: string;
  invitation_token?: string;
  expires_at?: string;
}

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

interface UnifiedUserManagerProps {
  companies: CompanyOption[];
}

const ROOT_COMPANY_NAME = 'RootedAI';

const UnifiedUserManager: React.FC<UnifiedUserManagerProps> = ({ companies }) => {
  const [users, setUsers] = useState<UnifiedUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UnifiedUserRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'Client',
    companyId: ''
  });

  const [editForm, setEditForm] = useState({
    display_name: '',
    role: 'Client' as 'Client' | 'Admin',
    companyId: '',
    companyRole: 'Member' as 'Admin' | 'Member'
  });

  // Deletion dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UnifiedUserRecord | null>(null);
  const [deleteOptions, setDeleteOptions] = useState({
    newsletter: true,
    userRecord: true,
    invitations: true,
    authRecord: true,
  });

  const { toast } = useToast();

  const fetchUnifiedUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_unified_user_data');
      
      if (error) throw error;
      
      const typedUsers: UnifiedUserRecord[] = (data || []).map((user: any) => ({
        ...user,
        id: user.user_id || user.invitation_id || user.newsletter_id || user.email, // Use appropriate ID
        companies: user.companies || []
      }));
      
      setUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching unified users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUnifiedUsers();
  }, [fetchUnifiedUsers]);

  const handleRefresh = () => {
    fetchUnifiedUsers();
    toast({
      title: 'Data refreshed',
      description: 'Latest user data loaded',
    });
  };

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    
    if (status === 'pending' && isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active User</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending Invitation</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired Invitation</Badge>;
      case 'newsletter_only':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Newsletter Only</Badge>;
      case 'unsubscribed':
        return <Badge variant="secondary">Unsubscribed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Accepted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Shield className="h-4 w-4 text-forest-green" />;
      case 'Client':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'Newsletter':
        return <Mail className="h-4 w-4 text-slate-gray" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      let clientName = '';
      if (inviteForm.role === 'Admin') {
        clientName = ROOT_COMPANY_NAME;
      } else {
        const selectedCompany = companies.find(c => c.id === inviteForm.companyId);
        if (!selectedCompany) {
          throw new Error('Please select a company');
        }
        clientName = selectedCompany.name;
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          role: inviteForm.role,
          client_name: clientName,
          company_id: inviteForm.companyId || undefined
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
      fetchUnifiedUsers();

    } catch (error) {
      console.error('Failed to send invitation:', error);
      let description = 'Failed to send invitation';

      const message = error instanceof Error ? error.message : '';
      if (message.includes('rate limit')) {
        description = 'Rate limit exceeded. Please wait before sending more invitations.';
      } else if (message) {
        description = message;
      }

      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = (user: UnifiedUserRecord) => {
    setUserToDelete(user);
    setDeleteOptions({ newsletter: true, userRecord: true, invitations: true, authRecord: true });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const deleteAll = deleteOptions.newsletter && deleteOptions.userRecord && deleteOptions.invitations && deleteOptions.authRecord;

      // Optimistically remove the user from the local state
      setUsers(prevUsers => prevUsers.filter(u => u.email !== userToDelete.email));

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userEmail: userToDelete.email,
          options: {
            deleteNewsletter: deleteOptions.newsletter,
            deleteUserRecord: deleteOptions.userRecord,
            deleteInvitations: deleteOptions.invitations,
            deleteAuth: deleteOptions.authRecord,
            deleteAll,
          },
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Delete completed',
        description: `${userToDelete.email} removed${deleteAll ? ' (all records)' : ''}`,
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      
      // Force refresh to ensure UI is in sync
      await fetchUnifiedUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
      // Revert optimistic update on error
      await fetchUnifiedUsers();
    }
  };

  const toggleNewsletterStatus = async (user: UnifiedUserRecord) => {
    try {
      if (!user.newsletter_id) {
        // Create newsletter subscription
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .insert({ 
            email: user.email, 
            status: 'active', 
            source: 'admin' 
          });
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'User subscribed to newsletter',
        });
      } else {
        // Toggle existing subscription
        const newStatus = user.newsletter_status === 'active' ? 'unsubscribed' : 'active';
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({ 
            status: newStatus,
            unsubscribed_at: newStatus === 'unsubscribed' ? new Date().toISOString() : null
          })
          .eq('id', user.newsletter_id);
        if (error) throw error;
        toast({
          title: 'Success',
          description: `Newsletter ${newStatus}`,
        });
      }
      
      fetchUnifiedUsers();
    } catch (error) {
      console.error('Error toggling newsletter status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update newsletter status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (user: UnifiedUserRecord) => {
    setEditingUser(user);
    setEditForm({
      display_name: user.name,
      role: user.role === 'Newsletter' ? 'Client' : user.role as 'Client' | 'Admin',
      companyId: user.companies[0]?.id || '',
      companyRole: (user.companies[0]?.userRole as 'Admin' | 'Member') || 'Member'
    });
    setIsEditDialogOpen(true);
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsLoading(true);

      // Handle different user types
      if (editingUser.source_table === 'users') {
        // Update active user's global role
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            display_name: editForm.display_name,
            role: editForm.role 
          })
          .eq('email', editingUser.email);
        
        if (userError) throw userError;

        // Handle company membership assignment/update
        if (editForm.companyId && editingUser.user_id) {
          // For Client users, enforce single-company membership by removing all existing memberships first
          if (editForm.role === 'Client') {
            // Remove all existing company memberships for Client users
            const { error: deleteError } = await supabase
              .from('company_memberships')
              .delete()
              .eq('user_id', editingUser.user_id);
            
            if (deleteError) throw deleteError;
            
            // Create new membership for the selected company
            const { error: membershipError } = await supabase
              .from('company_memberships')
              .insert({
                company_id: editForm.companyId,
                user_id: editingUser.user_id,
                role: editForm.companyRole
              });
            
            if (membershipError) throw membershipError;
          } else {
            // For Admin users, maintain existing multi-company logic
            const existingMembership = editingUser.companies?.find(c => c.id === editForm.companyId);
            
            if (existingMembership) {
              // Update existing membership
              const { error: membershipError } = await supabase
                .from('company_memberships')
                .update({ role: editForm.companyRole })
                .eq('company_id', editForm.companyId)
                .eq('user_id', editingUser.user_id);
              
              if (membershipError) throw membershipError;
            } else {
              // Create new membership
              const { error: membershipError } = await supabase
                .from('company_memberships')
                .insert({
                  company_id: editForm.companyId,
                  user_id: editingUser.user_id,
                  role: editForm.companyRole
                });
              
              if (membershipError) throw membershipError;
            }
          }
        }
      } else if (editingUser.source_table === 'user_invitations') {
        // Update pending invitation
        const nextCompanyId = editForm.companyId || null;

        if (editForm.role === 'Client' && !nextCompanyId) {
          throw new Error('Please select a company for client invitations');
        }

        let nextClientName: string | null = null;

        if (nextCompanyId) {
          const selectedCompany = companies.find((company) => company.id === nextCompanyId);
          if (!selectedCompany) {
            throw new Error('Selected company could not be found');
          }
          nextClientName = selectedCompany.name;
        } else if (editForm.role === 'Admin') {
          nextClientName = ROOT_COMPANY_NAME;
        } else {
          nextClientName = editingUser.companies?.[0]?.name ?? null;
        }

        const { error } = await supabase
          .from('user_invitations')
          .update({
            full_name: editForm.display_name,
            role: editForm.role,
            company_id: nextCompanyId,
            client_name: nextClientName,
          })
          .eq('id', editingUser.invitation_id);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUnifiedUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (user: UnifiedUserRecord, newRole: 'Client' | 'Admin') => {
    if (user.source_table !== 'users') {
      toast({
        title: 'Error',
        description: 'Can only update roles for active users',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('email', user.email);
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      });
      
      fetchUnifiedUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
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

  const resendInvitation = async (user: UnifiedUserRecord) => {
    if (!user.invitation_id) return;
    
    try {
      // Cancel old invitation and create new one
      await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', user.invitation_id);

      // Send new invitation
      setInviteForm({
        email: user.email,
        full_name: user.name,
        role: user.role === 'Newsletter' ? 'Client' : user.role,
        companyId: user.companies[0]?.id || ''
      });
      
      await sendInvitation(new Event('submit') as any);
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.companies.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const columns: Column<UnifiedUserRecord>[] = [
    {
      key: 'name',
      label: 'User',
      render: (user) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {getRoleIcon(user.role)}
            {user.name}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
      initialWidth: 250,
    },
    {
      key: 'status',
      label: 'Status',
      render: (user) => getStatusBadge(user.status, user.expires_at),
      initialWidth: 150,
    },
    {
      key: 'role',
      label: 'Role',
      render: (user) => (
        <div className="flex items-center gap-2">
          {getRoleIcon(user.role)}
          {user.role}
        </div>
      ),
      initialWidth: 120,
    },
    {
      key: 'companies',
      label: 'Companies',
      render: (user) => (
        <div className="space-y-1">
          {user.companies.length > 0 ? (
            user.companies.map((company, index) => (
              <div key={index} className="flex items-center gap-1 text-sm">
                <Building className="h-3 w-3" />
                {company.name}
                <Badge variant="secondary" className="text-xs">
                  {company.userRole}
                </Badge>
              </div>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">No companies</span>
          )}
        </div>
      ),
      initialWidth: 200,
    },
    {
      key: 'newsletter_frequency',
      label: 'Newsletter',
      render: (user) => (
        <div className="text-sm">
          {user.newsletter_status === 'active' && user.newsletter_frequency ? (
            <span className="capitalize text-green-600">
              {user.newsletter_frequency}
            </span>
          ) : user.newsletter_status === 'not_subscribed' ? (
            <span className="text-muted-foreground">Not subscribed</span>
          ) : (
            <span className="text-red-600">Unsubscribed</span>
          )}
        </div>
      ),
      initialWidth: 130,
    },
    {
      key: 'registration_date',
      label: 'Registered',
      render: (user) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {format(new Date(user.registration_date), 'MMM dd, yyyy')}
        </div>
      ),
      initialWidth: 140,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (user) => (
        <div className="flex gap-1 justify-end">
          {/* Newsletter Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleNewsletterStatus(user)}
            title={user.newsletter_status === 'active' ? 'Unsubscribe from newsletter' : 'Subscribe to newsletter'}
          >
            {user.newsletter_status === 'active' ? (
              <Bell className="h-3 w-3 text-green-600" />
            ) : (
              <BellOff className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>

          {/* Edit Action - Always Present */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditDialog(user)}
            title="Edit user details"
          >
            <Pencil className="h-3 w-3" />
          </Button>

          {/* Role-specific actions */}
          {user.status === 'pending' && user.invitation_token && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyInvitationLink(user.invitation_token!)}
                title="Copy invitation link"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resendInvitation(user)}
                title="Resend invitation"
              >
                <Send className="h-3 w-3" />
              </Button>
            </>
          )}

          {user.status === 'expired' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resendInvitation(user)}
              title="Resend invitation"
            >
              <Send className="h-3 w-3" />
            </Button>
          )}

          {user.status === 'newsletter_only' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setInviteForm({
                  email: user.email,
                  full_name: user.name,
                  role: 'Client',
                  companyId: ''
                });
                setIsInviteDialogOpen(true);
              }}
              title="Invite to platform"
            >
              <UserPlus className="h-3 w-3" />
            </Button>
          )}

          {user.source_table === 'users' && user.role !== 'Admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateUserRole(user, 'Admin')}
              title="Promote to Admin"
            >
              <Shield className="h-3 w-3" />
            </Button>
          )}

          {/* Delete Action */}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteUser(user)}
            title="Delete user"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      initialWidth: 200,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-forest-green flex items-center gap-2">
              <Users className="h-5 w-5" />
              Unified User Management
            </CardTitle>
            <p className="text-slate-gray text-sm">
              Manage all users, invitations, and newsletter subscriptions in one place
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 w-full lg:w-auto lg:flex-row">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="w-full lg:w-auto text-forest-green border-forest-green hover:bg-forest-green/10"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-forest-green hover:bg-forest-green/90 transition-colors w-full lg:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={sendInvitation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="user@company.com"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={inviteForm.full_name}
                      onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                      placeholder="John Doe"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Role
                    </Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, role: value, companyId: value === 'Client' ? inviteForm.companyId : '' })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteForm.role === 'Client' && (
                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Company
                      </Label>
                      <Select
                        value={inviteForm.companyId}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, companyId: value })}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="company">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-forest-green hover:bg-forest-green/90"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>
                <form onSubmit={updateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={editingUser?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_display_name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Display Name
                    </Label>
                    <Input
                      id="edit_display_name"
                      type="text"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                      placeholder="John Doe"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Global Role
                    </Label>
                    <Select
                      value={editForm.role}
                      onValueChange={(value) => setEditForm({ ...editForm, role: value as 'Client' | 'Admin' })}
                      disabled={isLoading || editingUser?.source_table === 'newsletter_subscriptions'}
                    >
                      <SelectTrigger id="edit_role">
                        <SelectValue placeholder="Select global role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    {editingUser?.source_table === 'newsletter_subscriptions' && (
                      <p className="text-xs text-muted-foreground">
                        Newsletter-only users cannot have their role changed
                      </p>
                    )}
                  </div>

                  {editingUser?.source_table !== 'newsletter_subscriptions' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edit_company" className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Company Assignment
                        </Label>
                        <Select
                          value={editForm.companyId}
                          onValueChange={(value) => {
                            const existingCompany = editingUser?.companies?.find(c => c.id === value);
                            setEditForm({ 
                              ...editForm, 
                              companyId: value,
                              companyRole: (existingCompany?.userRole as 'Admin' | 'Member') || 'Member'
                            });
                          }}
                          disabled={isLoading}
                        >
                          <SelectTrigger id="edit_company">
                            <SelectValue placeholder="Select company to assign/edit" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => {
                              const userCompany = editingUser?.companies?.find(c => c.id === company.id);
                              return (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name} {userCompany ? `(Current: ${userCompany.userRole})` : '(Not a member)'}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a company to assign the user to or edit their existing membership
                        </p>
                      </div>

                      {editForm.companyId && (
                        <div className="space-y-2">
                          <Label htmlFor="edit_company_role" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Company Role
                          </Label>
                          <Select
                            value={editForm.companyRole}
                            onValueChange={(value) => setEditForm({ ...editForm, companyRole: value as 'Admin' | 'Member' })}
                            disabled={isLoading}
                          >
                            <SelectTrigger id="edit_company_role">
                              <SelectValue placeholder="Select company role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Company Admin</SelectItem>
                              <SelectItem value="Member">Company Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            This sets the user's role within the selected company
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-forest-green hover:bg-forest-green/90"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating...' : 'Update User'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select what to delete for <span className="font-medium text-foreground">{userToDelete?.email}</span>.
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={deleteOptions.newsletter}
                        onCheckedChange={(c) => setDeleteOptions((o) => ({ ...o, newsletter: Boolean(c) }))}
                      />
                      <span className="text-sm">Newsletter subscription record</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={deleteOptions.userRecord}
                        onCheckedChange={(c) => setDeleteOptions((o) => ({ ...o, userRecord: Boolean(c) }))}
                      />
                      <span className="text-sm">User record (profile, memberships)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={deleteOptions.invitations}
                        onCheckedChange={(c) => setDeleteOptions((o) => ({ ...o, invitations: Boolean(c) }))}
                      />
                      <span className="text-sm">User invitations</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={deleteOptions.authRecord}
                        onCheckedChange={(c) => setDeleteOptions((o) => ({ ...o, authRecord: Boolean(c) }))}
                      />
                      <span className="text-sm">Authentication account (auth.users)</span>
                    </label>
                    <div className="pt-1 text-xs text-muted-foreground">
                      Tip: Select all to perform a complete deletion.
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={confirmDeleteUser}
                      disabled={!deleteOptions.newsletter && !deleteOptions.userRecord && !deleteOptions.invitations && !deleteOptions.authRecord}
                    >
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by email, name, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Users</SelectItem>
                <SelectItem value="pending">Pending Invitations</SelectItem>
                <SelectItem value="expired">Expired Invitations</SelectItem>
                <SelectItem value="newsletter_only">Newsletter Only</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
            </p>
          </div>
        ) : (
          <SortableTable
            data={filteredUsers}
            columns={columns}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedUserManager;