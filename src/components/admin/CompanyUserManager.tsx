import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Search, 
  Plus, 
  Edit, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar, 
  Bell, 
  BellOff, 
  RefreshCw,
  Users,
  Clock,
  Trash2,
  Send,
  Copy,
  RotateCcw,
  Eye,
  Shield,
  User,
  Building2,
  Activity
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InviteUserForm from '@/components/InviteUserForm';
import { SortableTable } from './SortableTable';
import { LoadingIcon } from '@/components/LoadingSpinner';
import { format } from 'date-fns';

interface CompanyUserRecord {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    userRole: string;
  }>;
  newsletter_status: string;
  newsletter_frequency: string;
  registration_date: string;
  last_activity: string;
  source_table: 'users' | 'user_invitations' | 'newsletter_subscriptions';
  user_id?: string;
  invitation_id?: string;
  newsletter_id?: string;
  invitation_token?: string;
  expires_at?: string;
  company_role: string;
}

interface CompanyUserManagerProps {
  companyId: string;
  companyName: string;
}

export const CompanyUserManager: React.FC<CompanyUserManagerProps> = ({ 
  companyId, 
  companyName 
}) => {
  const [users, setUsers] = useState<CompanyUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CompanyUserRecord | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUserRecord | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('users');
  
  const [editForm, setEditForm] = useState<{
    email: string;
    company_role: string;
    newsletter_status: string;
    newsletter_frequency: string;
  }>({
    email: '',
    company_role: '',
    newsletter_status: '',
    newsletter_frequency: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_company_users_for_admin', {
        p_company_id: companyId
      });

      if (error) throw error;
      const processedData = (data || []).map((user: any, index: number) => ({
        ...user,
        id: user.user_id || user.invitation_id || `${user.email}-${index}`
      }));
      setUsers(processedData);
    } catch (error: any) {
      console.error('Error fetching company users:', error);
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchActivity = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_user_activity', {
        p_company_id: companyId,
        p_limit: 100
      });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching company activity:', error);
      toast.error('Failed to load activity logs: ' + error.message);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchUsers();
      fetchActivity();
    }
  }, [companyId, fetchUsers, fetchActivity]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.company_role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;
  const isPartiallySelected = selectedUsers.size > 0 && selectedUsers.size < filteredUsers.length;

  const openEditDialog = (user: CompanyUserRecord) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      company_role: user.company_role,
      newsletter_status: user.newsletter_status,
      newsletter_frequency: user.newsletter_frequency || 'weekly'
    });
    setEditDialogOpen(true);
  };

  const updateUser = async () => {
    try {
      if (!editingUser) return;

      // Update company role using new secure function
      if (editingUser.user_id && editForm.company_role !== editingUser.company_role) {
      const { data, error } = await supabase.rpc('update_company_user_role', {
        p_user_id: editingUser.user_id,
        p_company_id: companyId,
        p_new_role: editForm.company_role
      });

      if (error) throw error;
      if (data && typeof data === 'object' && data !== null && 'success' in data) {
        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to update user role');
        }
      }
      }

      // Update newsletter preferences
      if (editingUser.user_id && 
          (editForm.newsletter_status !== editingUser.newsletter_status || 
           editForm.newsletter_frequency !== editingUser.newsletter_frequency)) {
        
        const { error: newsletterError } = await supabase.rpc('update_newsletter_preferences', {
          p_user_id: editingUser.user_id,
          p_email: editingUser.email,
          p_status: editForm.newsletter_status,
          p_frequency: editForm.newsletter_frequency,
          p_company_id: companyId
        });

        if (newsletterError) throw newsletterError;
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
      fetchActivity(); // Refresh activity logs
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + error.message);
    }
  };

  const resendInvitation = async (user: CompanyUserRecord) => {
    if (!user.invitation_id) {
      toast.error('Cannot resend: No invitation found');
      return;
    }

    try {
    const { data, error } = await supabase.rpc('resend_company_invitation', {
      p_invitation_id: user.invitation_id,
      p_company_id: companyId
    });

    if (error) throw error;
    if (data && typeof data === 'object' && data !== null && 'success' in data) {
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend invitation');
      }
    }

      toast.success(`Invitation resent to ${user.email}`);
      fetchUsers();
      fetchActivity();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation: ' + error.message);
    }
  };

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast.success('Invitation link copied to clipboard');
  };

  const toggleNewsletterStatus = async (user: CompanyUserRecord) => {
    if (!user.user_id) return;

    try {
      const newStatus = user.newsletter_status === 'active' ? 'unsubscribed' : 'active';
      const { error } = await supabase.rpc('update_newsletter_preferences', {
        p_user_id: user.user_id,
        p_email: user.email,
        p_status: newStatus,
        p_frequency: user.newsletter_frequency || 'weekly',
        p_company_id: companyId
      });

      if (error) throw error;

      toast.success(
        newStatus === 'active' 
          ? `${user.email} subscribed to newsletter` 
          : `${user.email} unsubscribed from newsletter`
      );
      fetchUsers();
      fetchActivity();
    } catch (error: any) {
      console.error('Error updating newsletter status:', error);
      toast.error('Failed to update newsletter status: ' + error.message);
    }
  };

  const bulkRemoveUsers = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const selectedUserData = users.filter(user => selectedUsers.has(user.id));
      
      for (const user of selectedUserData) {
        const { data, error } = await supabase.rpc('remove_user_from_company', {
          p_user_email: user.email,
          p_company_id: companyId
        });

        if (error) throw error;
        
        const result = data as { success: boolean; error?: string; };
        if (!result.success) {
          console.warn(`Failed to remove ${user.email}: ${result.error}`);
        }
      }

      toast.success(`Removed ${selectedUsers.size} users from ${companyName}`);
      setSelectedUsers(new Set());
      fetchUsers();
      fetchActivity();
    } catch (error: any) {
      console.error('Error removing users:', error);
      toast.error('Failed to remove some users: ' + error.message);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const { data, error } = await supabase.rpc('remove_user_from_company', {
        p_user_email: userToDelete.email,
        p_company_id: companyId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; user_email?: string; company_name?: string; };

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove user');
      }

      toast.success(`Successfully removed ${userToDelete.email} from ${companyName}`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user: ' + error.message);
    }
  };

  const openDeleteDialog = (user: CompanyUserRecord) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      active: { variant: 'default', icon: UserCheck },
      pending: { variant: 'secondary', icon: Clock },
      expired: { variant: 'destructive', icon: UserX },
      unsubscribed: { variant: 'outline', icon: UserX },
      newsletter_only: { variant: 'secondary', icon: Mail }
    };
    
    const config = variants[status] || variants.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getRoleBadge = (companyRole: string) => {
    return (
      <Badge variant={companyRole === 'Admin' ? 'default' : 'secondary'}>
        {companyRole}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'select',
      label: 'Select',
      sortable: false,
      render: (user: CompanyUserRecord) => (
        <div className="flex items-center">
          <Checkbox
            checked={selectedUsers.has(user.id)}
            onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
            aria-label={`Select ${user.name}`}
          />
        </div>
      )
    },
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (user: CompanyUserRecord) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{user.name}</div>
            {user.role === 'Admin' && <Shield className="h-4 w-4 text-primary" />}
            {user.role === 'Client' && <User className="h-4 w-4 text-blue-600" />}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user: CompanyUserRecord) => getStatusBadge(user.status)
    },
    {
      key: 'company_role',
      label: 'Company Role',
      sortable: true,
      render: (user: CompanyUserRecord) => getRoleBadge(user.company_role)
    },
    {
      key: 'newsletter_frequency',
      label: 'Newsletter',
      sortable: true,
      render: (user: CompanyUserRecord) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleNewsletterStatus(user)}
            disabled={!user.user_id || user.status !== 'active'}
          >
            {user.newsletter_status === 'active' ? (
              <Bell className="h-4 w-4 text-green-600" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <span className="text-sm">
            {user.newsletter_status === 'active' ? user.newsletter_frequency : 'Not subscribed'}
          </span>
        </div>
      )
    },
    {
      key: 'registration_date',
      label: 'Joined',
      sortable: true,
      render: (user: CompanyUserRecord) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(user.registration_date).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (user: CompanyUserRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(user)}
            disabled={user.status === 'expired'}
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          {user.status === 'pending' && user.invitation_token && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyInvitationLink(user.invitation_token!)}
                title="Copy invitation link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resendInvitation(user)}
                title="Resend invitation"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {user.status === 'expired' && user.invitation_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resendInvitation(user)}
              title="Resend expired invitation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(user)}
            disabled={user.status === 'expired'}
            className="text-destructive hover:text-destructive"
            title="Remove user"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company User Management - {companyName}
            </CardTitle>
            <CardDescription>
              Comprehensive user management for your company with full administrative capabilities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchUsers();
                fetchActivity();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActivityDialogOpen(true)}
              title="View company activity"
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite User to {companyName}</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your company
                  </DialogDescription>
                </DialogHeader>
                <InviteUserForm 
                  companyId={companyId}
                  companyName={companyName}
                  onInvitationSent={() => {
                    setInviteDialogOpen(false);
                    fetchUsers();
                    fetchActivity();
                  }} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity ({activities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Enhanced Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="newsletter_only">Newsletter Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Company Admin</SelectItem>
                  <SelectItem value="Member">Company Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkRemoveUsers}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}

            {/* Users Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingIcon size="lg" />
              </div>
            ) : (
              <SortableTable
                data={filteredUsers}
                columns={columns}
                defaultSortKey="registration_date"
                defaultAsc={false}
              />
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Company Activity Log</h3>
                <p className="text-sm text-muted-foreground">
                  Recent user management activities for {companyName}
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No activity logs found
                  </div>
                ) : (
                  <div className="divide-y">
                    {activities.map((activity) => (
                      <div key={activity.activity_id} className="p-4 hover:bg-muted/50">
                        <div className="flex items-start gap-3">
                          <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{activity.activity_type}</span>
                              {activity.user_email && (
                                <Badge variant="outline">{activity.user_email}</Badge>
                              )}
                            </div>
                            {activity.activity_description && (
                              <p className="text-sm text-muted-foreground">
                                {activity.activity_description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Enhanced Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User - {editingUser?.name}</DialogTitle>
              <DialogDescription>
                Update user role and newsletter preferences for {editForm.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_role">Company Role</Label>
                <Select value={editForm.company_role} onValueChange={(value) => 
                  setEditForm(prev => ({ ...prev, company_role: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Company Admin</SelectItem>
                    <SelectItem value="Member">Company Member</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Company admins can manage users and settings for this company
                </p>
              </div>
              
              <div>
                <Label htmlFor="newsletter_status">Newsletter Status</Label>
                <Select value={editForm.newsletter_status} onValueChange={(value) => 
                  setEditForm(prev => ({ ...prev, newsletter_status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Subscribed</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.newsletter_status === 'active' && (
                <div>
                  <Label htmlFor="newsletter_frequency">Newsletter Frequency</Label>
                  <Select value={editForm.newsletter_frequency} onValueChange={(value) => 
                    setEditForm(prev => ({ ...prev, newsletter_frequency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={updateUser} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Company Activity - {companyName}</DialogTitle>
              <DialogDescription>
                Recent user management activities and audit logs
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No activity logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.activity_id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{activity.activity_type}</span>
                            {activity.user_email && (
                              <Badge variant="outline" className="text-xs">
                                {activity.user_email}
                              </Badge>
                            )}
                          </div>
                          {activity.activity_description && (
                            <p className="text-sm text-muted-foreground mb-1">
                              {activity.activity_description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Delete User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User from Company</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{userToDelete?.name}</strong> ({userToDelete?.email}) from <strong>{companyName}</strong>?
                <br /><br />
                <div className="rounded-lg bg-muted p-3 mt-3">
                  <p className="font-medium text-sm mb-2">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Remove their access to the company portal</li>
                    <li>Cancel their company-specific newsletter subscription</li>
                    <li>Remove them from all company teams and projects</li>
                    <li>Revoke their company admin privileges (if applicable)</li>
                    <li>Log this removal in the company activity feed</li>
                  </ul>
                </div>
                <br />
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This action cannot be undone. The user would need to be re-invited to regain access.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};