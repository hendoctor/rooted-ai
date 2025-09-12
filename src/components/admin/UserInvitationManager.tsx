import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SortableTable, { Column } from './SortableTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Mail, User, Shield, Building, Plus, X, ExternalLink, Clock, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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

interface CompanyOption {
  id: string;
  name: string;
}

interface UserInvitationManagerProps {
  onInvitationSent?: () => void;
  companies: CompanyOption[];
  /**
   * When true, renders the invitation manager without the outer Card wrapper
   * so it can be embedded inside another component.
   */
  embedded?: boolean;
}

const ROOT_COMPANY_NAME = 'RootedAI';

const UserInvitationManager: React.FC<UserInvitationManagerProps> = ({ onInvitationSent, companies, embedded = false }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'Client',
    companyId: ''
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
    role: 'Client',
    companyId: ''
  });
  const { toast } = useToast();

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

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRefresh = () => {
    fetchInvitations();
    toast({
      title: 'Invitations refreshed',
      description: 'Latest invitations loaded',
    });
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
      if (formData.role === 'Admin') {
        clientName = ROOT_COMPANY_NAME;
      } else {
        const selectedCompany = companies.find(c => c.id === formData.companyId);
        if (!selectedCompany) {
          throw new Error('Please select a company');
        }
        clientName = selectedCompany.name;
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
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
        description: `Successfully sent invitation to ${formData.email}`,
      });

      setFormData({ email: '', full_name: '', role: 'Client', companyId: '' });
      setIsDialogOpen(false);
      fetchInvitations();
      onInvitationSent?.();

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

  const handleEdit = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    let companyId = '';
    if (invitation.role === 'Client' && invitation.client_name) {
      const company = companies.find(c => c.name === invitation.client_name);
      if (company) {
        companyId = company.id;
      }
    }
    setEditFormData({
      email: invitation.email,
      full_name: invitation.full_name,
      role: invitation.role,
      companyId
    });
    setIsEditDialogOpen(true);
  };

  const updateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvitation) return;
    try {
      let clientName = '';
      if (editFormData.role === 'Admin') {
        clientName = ROOT_COMPANY_NAME;
      } else {
        const selectedCompany = companies.find(c => c.id === editFormData.companyId);
        if (!selectedCompany) {
          throw new Error('Please select a company');
        }
        clientName = selectedCompany.name;
      }

      const { error } = await supabase
        .from('user_invitations')
        .update({
          email: editFormData.email,
          full_name: editFormData.full_name,
          role: editFormData.role,
          client_name: clientName,
        })
        .eq('id', editingInvitation.id);

      if (error) throw error;

      toast({
        title: 'Invitation Updated',
        description: 'Invitation updated successfully',
      });

      setIsEditDialogOpen(false);
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

  const columns: Column<Invitation>[] = [
    {
      key: 'full_name',
      label: 'User',
      render: (inv) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {inv.role === 'Admin' ? (
              <Shield className="h-4 w-4 text-forest-green" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            {inv.full_name}
          </div>
          <div className="text-sm text-muted-foreground">{inv.email}</div>
        </div>
      ),
      initialWidth: 200,
    },
    {
      key: 'role',
      label: 'Role',
      render: (inv) => inv.role,
      initialWidth: 100,
    },
    {
      key: 'client_name',
      label: 'Company',
      render: (inv) => inv.client_name || (inv.role === 'Admin' ? ROOT_COMPANY_NAME : 'No company'),
      initialWidth: 150,
    },
    {
      key: 'status',
      label: 'Status',
      render: (inv) => getStatusBadge(inv.status, inv.expires_at),
      initialWidth: 120,
    },
    {
      key: 'created_at',
      label: 'Sent',
      render: (inv) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {format(new Date(inv.created_at), 'MMM dd, yyyy')}
        </div>
      ),
      initialWidth: 150,
    },
    {
      key: 'expires_at',
      label: 'Expires',
      render: (inv) => (
        <div className="text-sm">
          {format(new Date(inv.expires_at), 'MMM dd, yyyy')}
        </div>
      ),
      initialWidth: 150,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (inv) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(inv)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteInvitation(inv.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {inv.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyInvitationLink(inv.invitation_token)}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelInvitation(inv.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      initialWidth: 160,
    },
  ];

  const headerContent = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        {embedded ? (
          <h3 className="text-forest-green flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5" />
            User Invitations
          </h3>
        ) : (
          <CardTitle className="text-forest-green flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Invitations
          </CardTitle>
        )}
        <p className="text-slate-gray text-sm">
          Invite administrators or clients to the platform
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="w-full lg:w-auto text-forest-green border-forest-green hover:bg-forest-green/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value, companyId: value === 'Client' ? formData.companyId : '' })}
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

              {formData.role === 'Client' ? (
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company
                  </Label>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) => setFormData({ ...formData, companyId: value })}
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
                  <p className="text-xs text-slate-gray">
                    Client will be assigned to this company portal
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Admins are added to the {ROOT_COMPANY_NAME} company by default.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-forest-green hover:bg-forest-green/90"
                >
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  const tableContent = invitations.length === 0 ? (
    <p className="text-center text-muted-foreground">No invitations sent yet</p>
  ) : (
    <SortableTable data={invitations} columns={columns} />
  );

  const editDialog = (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Invitation</DialogTitle>
        </DialogHeader>
        <form onSubmit={updateInvitation} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="edit_email"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_full_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="edit_full_name"
              type="text"
              value={editFormData.full_name}
              onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <Select
              value={editFormData.role}
              onValueChange={(value) => setEditFormData({ ...editFormData, role: value, companyId: value === 'Client' ? editFormData.companyId : '' })}
            >
              <SelectTrigger id="edit_role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editFormData.role === 'Client' && (
            <div className="space-y-2">
              <Label htmlFor="edit_company" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company
              </Label>
              <Select
                value={editFormData.companyId}
                onValueChange={(value) => setEditFormData({ ...editFormData, companyId: value })}
              >
                <SelectTrigger id="edit_company">
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
            <Button type="submit" className="flex-1 bg-forest-green hover:bg-forest-green/90">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {headerContent}
        {tableContent}
        {editDialog}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>{headerContent}</CardHeader>
      <CardContent>{tableContent}</CardContent>
      {editDialog}
    </Card>
  );
};

export default UserInvitationManager;

