import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Users, UserPlus, Shield, Clock, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserWithProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
  };
}

interface InvitationData {
  email: string;
  full_name: string;
  role: string;
}

const EnhancedUserManagement = () => {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [invitations, setInvitations] = useState<Tables<'user_invitations'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<UserWithProfile | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData>({
    email: '',
    full_name: '',
    role: 'Public'
  });
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with profiles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          created_at,
          updated_at,
          profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Transform the data to handle the profile relationship
      const transformedUsers = (usersData || []).map(user => ({
        ...user,
        profile: Array.isArray(user.profile) && user.profile.length > 0 
          ? user.profile[0] 
          : null
      }));

      setUsers(transformedUsers);

      // Fetch invitations and clean up expired ones
      await supabase.rpc('cleanup_expired_invitations');
      
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to load user management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!invitationData.email || !invitationData.full_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: invitationData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Invitation Sent!",
        description: `Successfully sent invitation to ${invitationData.email}`,
      });

      // Reset form and close dialog
      setInvitationData({ email: '', full_name: '', role: 'Public' });
      setShowCreateDialog(false);
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role has been successfully updated",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (user: UserWithProfile) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `Successfully deleted user ${user.email}`,
      });

      fetchData();
      setSelectedForDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (invitation: Tables<'user_invitations'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const deleteInvitation = async (invitation: Tables<'user_invitations'>) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Deleted",
        description: `Successfully deleted invitation for ${invitation.email}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  const getInvitationStatus = (invitation: Tables<'user_invitations'>) => {
    const isExpired = new Date(invitation.expires_at) < new Date();
    
    if (invitation.status === 'accepted') {
      return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, badge: "Accepted", color: "bg-green-100 text-green-800" };
    } else if (isExpired) {
      return { icon: <XCircle className="h-4 w-4 text-red-600" />, badge: "Expired", color: "bg-red-100 text-red-800" };
    } else {
      return { icon: <Clock className="h-4 w-4 text-yellow-600" />, badge: "Pending", color: "bg-yellow-100 text-yellow-800" };
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const channel = supabase
      .channel('user-management-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_invitations'
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-green"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-forest-green flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Users ({users.length})
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-forest-green hover:bg-forest-green/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send User Invitation</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to a new user to join the platform.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email Address *</label>
                    <Input
                      type="email"
                      value={invitationData.email}
                      onChange={(e) => setInvitationData({ ...invitationData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      type="text"
                      value={invitationData.full_name}
                      onChange={(e) => setInvitationData({ ...invitationData, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role *</label>
                    <Select
                      value={invitationData.role}
                      onValueChange={(value) => setInvitationData({ ...invitationData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Public">Public</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={sendInvitation} className="bg-forest-green hover:bg-forest-green/90">
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border border-sage/50 divide-y divide-sage/50">
              <thead className="bg-sage/20">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Joined</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-forest-green">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/30">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-sage/10">
                    <td className="px-4 py-3 text-slate-gray font-medium">
                      {user.profile?.full_name || 'No name set'}
                    </td>
                    <td className="px-4 py-3 text-slate-gray">{user.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Public">Public</SelectItem>
                          <SelectItem value="Client">Client</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-gray text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-forest-green flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-slate-gray text-center py-8">No invitations sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-sage/50 divide-y divide-sage/50">
                <thead className="bg-sage/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Expires</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-forest-green">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/30">
                  {invitations.map((invitation) => {
                    const status = getInvitationStatus(invitation);
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    const canResend = invitation.status === 'pending' && !isExpired;
                    
                    return (
                      <tr key={invitation.id} className="hover:bg-sage/10">
                        <td className="px-4 py-3 text-slate-gray font-medium">
                          {invitation.full_name}
                        </td>
                        <td className="px-4 py-3 text-slate-gray">{invitation.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-forest-green border-forest-green">
                            {invitation.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {status.icon}
                            <Badge className={status.color}>{status.badge}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-gray text-sm">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the invitation for {invitation.full_name} ({invitation.email})?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteInvitation(invitation)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
    </div>
  );
};

export default EnhancedUserManagement;