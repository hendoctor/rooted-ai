import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const InvitationsTable = () => {
  const [invitations, setInvitations] = useState<Tables<'user_invitations'>[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Failed to fetch invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitation: Tables<'user_invitations'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: invitation.email,
          full_name: invitation.full_name,
          role: invitation.role
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Invitation Resent!",
        description: `Successfully resent invitation to ${invitation.email}`,
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isExpired) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Accepted</Badge>;
    } else if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-green"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-forest-green flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Sent Invitations
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInvitations}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-slate-gray text-center py-8">No invitations sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[40rem] w-full border border-sage/50 divide-y divide-sage/50">
              <thead className="bg-sage/20">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Sent</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Expires</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-forest-green">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/30">
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const canResend = invitation.status === 'pending' && !isExpired;
                  
                  return (
                    <tr key={invitation.id} className="hover:bg-sage/10">
                      <td className="px-4 py-3 text-slate-gray font-medium">
                        {invitation.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-gray">
                        {invitation.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-forest-green border-forest-green">
                          {invitation.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invitation.status, invitation.expires_at)}
                          {getStatusBadge(invitation.status, invitation.expires_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-gray text-sm">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-gray text-sm">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {canResend && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation(invitation)}
                            className="text-forest-green border-forest-green hover:bg-forest-green hover:text-white"
                          >
                            Resend
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitationsTable;