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
import { UserPlus, Mail, User, Shield, Building, Plus, X, ExternalLink, Clock, RefreshCw } from 'lucide-react';
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
}

const ROOT_COMPANY_NAME = 'RootedAI';

const UserInvitationManager: React.FC<UserInvitationManagerProps> = ({ onInvitationSent, companies }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
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
                variant="outline"
                onClick={() => cancelInvitation(inv.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      initialWidth: 120,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-forest-green flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              User Invitations
            </CardTitle>
            <p className="text-slate-gray text-sm">
              Invite administrators or clients to the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-forest-green hover:bg-forest-green/90">
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
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-center text-muted-foreground">No invitations sent yet</p>
        ) : (
          <SortableTable data={invitations} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default UserInvitationManager;

