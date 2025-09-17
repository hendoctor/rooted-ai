import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import InviteUserForm from '@/components/InviteUserForm';
import { SortableTable } from './SortableTable';
import { LoadingIcon } from '@/components/LoadingSpinner';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
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

  const fetchUsers = async () => {
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
  };

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const openEditDialog = (user: CompanyUserRecord) => {
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
      const userToUpdate = users.find(u => u.email === editForm.email);
      if (!userToUpdate) return;

      // Update company role
      if (userToUpdate.user_id && editForm.company_role !== userToUpdate.company_role) {
        const { error: roleError } = await supabase
          .from('company_memberships')
          .update({ role: editForm.company_role })
          .eq('company_id', companyId)
          .eq('user_id', userToUpdate.user_id);

        if (roleError) throw roleError;
      }

      // Update newsletter preferences
      if (userToUpdate.user_id && 
          (editForm.newsletter_status !== userToUpdate.newsletter_status || 
           editForm.newsletter_frequency !== userToUpdate.newsletter_frequency)) {
        
        const { error: newsletterError } = await supabase.rpc('update_newsletter_preferences', {
          p_user_id: userToUpdate.user_id,
          p_email: userToUpdate.email,
          p_status: editForm.newsletter_status,
          p_frequency: editForm.newsletter_frequency,
          p_company_id: companyId
        });

        if (newsletterError) throw newsletterError;
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + error.message);
    }
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
      key: 'name',
      label: 'User',
      sortable: true,
      render: (user: CompanyUserRecord) => (
        <div className="space-y-1">
          <div className="font-medium">{user.name}</div>
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
          {user.newsletter_status === 'active' ? (
            <Bell className="h-4 w-4 text-forest-green" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(user)}
            disabled={user.status === 'expired'}
          >
            <Edit className="h-4 w-4" />
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
              <Users className="h-5 w-5" />
              Manage Users - {companyName}
            </CardTitle>
            <CardDescription>
              Manage user roles and permissions for your company
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                  onInvitationSent={() => {
                    setInviteDialogOpen(false);
                    fetchUsers();
                  }} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
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
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
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
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={updateUser}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};