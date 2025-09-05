import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SortableTable, { Column } from './SortableTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, User, Plus, X, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AdminInvitation {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  invitation_token: string;
}

interface AdminInvitationManagerProps {
  onInvitationSent?: () => void;
}

const AdminInvitationManager: React.FC<AdminInvitationManagerProps> = ({ onInvitationSent }) => {
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('role', 'Admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as AdminInvitation[]) ?? []);
    } catch (error) {
      console.error('Error fetching admin invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin invitations',
        variant: 'destructive'
      });
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

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: formData.email,
          full_name: formData.full_name,
          role: 'Admin'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Admin Invitation Sent!',
        description: `Successfully sent admin invitation to ${formData.email}`,
      });

      setFormData({ email: '', full_name: '' });
      setIsDialogOpen(false);
      fetchInvitations();
      onInvitationSent?.();

    } catch (error) {
      console.error('Failed to send admin invitation:', error);
      let description = 'Failed to send admin invitation';

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
        description: 'Admin invitation cancelled successfully',
      });
      
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling admin invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel admin invitation',
        variant: 'destructive'
      });
    }
  };

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: 'Copied!',
      description: 'Admin invitation link copied to clipboard',
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

  const columns: Column<AdminInvitation>[] = [
    {
      key: 'full_name',
      label: 'Admin User',
      render: (inv) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-forest-green" />
            {inv.full_name}
          </div>
          <div className="text-sm text-muted-foreground">{inv.email}</div>
        </div>
      ),
      initialWidth: 200,
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
      <CardHeader className="space-y-4">
        <CardTitle className="text-forest-green flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Invitations
        </CardTitle>
        <p className="text-slate-gray text-sm">
          Invite other administrators to help manage the platform
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-forest-green hover:bg-forest-green/90 w-fit">
              <Plus className="h-4 w-4 mr-2" />
              Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Admin</DialogTitle>
            </DialogHeader>
            <form onSubmit={sendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@company.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-full-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="admin-full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  <Shield className="h-4 w-4 inline mr-1" />
                  This user will have full administrative access to all platform features and client data.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 bg-forest-green hover:bg-forest-green/90"
                >
                  {isLoading ? "Sending..." : "Send Admin Invitation"}
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
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-center text-muted-foreground">No admin invitations sent yet</p>
        ) : (
          <SortableTable data={invitations} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default AdminInvitationManager;