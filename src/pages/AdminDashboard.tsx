import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccessDenied from './AccessDenied';
import { useAuth } from '@/hooks/useAuthSecure';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import InviteUserForm from '@/components/InviteUserForm';
import { Shield, Users, UserCheck, Building, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserWithRole extends Tables<'profiles'> {
  user_role?: string;
  client_name?: string | null;
}

interface ClientCompany {
  name: string;
  userCount: number;
  users: string[];
}

const AdminDashboard = () => {
  const { user, userRole, profile, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Tables<'role_permissions'>[]>([]);
  const [invitations, setInvitations] = useState<Tables<'user_invitations'>[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '', client_name: '' });

  useEffect(() => {
    console.log('AdminDashboard: useEffect triggered, userRole:', userRole);
    if (userRole === 'Admin') {
      console.log('AdminDashboard: Fetching data as Admin');
      fetchAllData();
      setupRealtimeSubscriptions();
    } else {
      console.log('AdminDashboard: Not admin, userRole:', userRole);
      setLoadingData(false);
    }
  }, [userRole]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchUsersWithRoles(),
      fetchRolePermissions(),
      fetchInvitations()
    ]);
    setLoadingData(false);
  };

  const fetchUsersWithRoles = async () => {
    // Get profiles and their corresponding user roles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError || !profilesData) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Get user roles and client names separately
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('email, role, client_name');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    // Combine the data
    const usersWithRoles = profilesData.map(profile => {
      const userData = usersData?.find(u => u.email === profile.email);
      return {
        ...profile,
        user_role: userData?.role || 'Client',
        client_name: userData?.client_name || null
      };
    });
    
    setUsers(usersWithRoles);
    
    // Extract client companies for B2B management
    const companies = usersData?.reduce((acc, user) => {
      if (user.client_name) {
        if (!acc[user.client_name]) {
          acc[user.client_name] = { name: user.client_name, userCount: 0, users: [] };
        }
        acc[user.client_name].userCount++;
        acc[user.client_name].users.push(user.email);
      }
      return acc;
    }, {} as Record<string, ClientCompany>) || {};
    
    setClientCompanies(Object.values(companies));
  };

  const fetchRolePermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .in('role', ['Client', 'Admin'])
      .order('role', { ascending: true });
    
    if (!error) {
      setRolePermissions(data ?? []);
    }
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setInvitations(data ?? []);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to users table changes
    const usersChannel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsersWithRoles();
      })
      .subscribe();

    // Subscribe to role permissions changes
    const permissionsChannel = supabase
      .channel('permissions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
        fetchRolePermissions();
      })
      .subscribe();

    // Subscribe to invitations changes
    const invitationsChannel = supabase
      .channel('invitations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_invitations' }, () => {
        fetchInvitations();
      })
      .subscribe();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsersWithRoles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(permissionsChannel);
      supabase.removeChannel(invitationsChannel);
      supabase.removeChannel(profilesChannel);
    };
  };

  const updateUserRole = async (userEmail: string, newRole: 'Client' | 'Admin') => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('email', userEmail);
    
    if (!error) {
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const updatePermission = async (id: string, field: 'access' | 'visible', value: boolean) => {
    const { error } = await supabase
      .from('role_permissions')
      .update({ [field]: value })
      .eq('id', id);
    
    if (!error) {
      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    console.log('Cancelling invitation:', invitationId);
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      console.log('Cancel invitation result:', { error });
      
      if (!error) {
        toast({
          title: "Success",
          description: "Invitation cancelled successfully",
        });
      } else {
        console.error('Failed to cancel invitation:', error);
        toast({
          title: "Error",
          description: `Failed to cancel invitation: ${error.message}`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Unexpected error cancelling invitation:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while cancelling the invitation",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userEmail: string) => {
    const { error } = await supabase.rpc('delete_user_completely', {
      user_email: userEmail
    });
    
    if (!error) {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.user_role || 'Client',
      client_name: user.client_name || ''
    });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update user role and client_name
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          role: editForm.role, 
          client_name: editForm.client_name || null,
          updated_at: new Date().toISOString() 
        })
        .eq('email', editingUser.email);

      if (userError) throw userError;

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  if (loading || loadingData) {
    console.log('AdminDashboard: Loading state - loading:', loading, 'loadingData:', loadingData);
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-green mx-auto mb-4"></div>
          <p className="text-slate-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'Admin') {
    console.log('AdminDashboard: Access denied - user:', !!user, 'userRole:', userRole);
    return <AccessDenied />;
  }

  const activePages = ['/', '/admin'];
  const filteredPermissions = rolePermissions.filter(p => activePages.includes(p.page));
  const permissionsByPage = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.page]) acc[perm.page] = {};
    acc[perm.page][perm.role] = perm;
    return acc;
  }, {} as Record<string, Record<string, Tables<'role_permissions'>>>);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
            <p className="text-slate-gray mb-6">
              Welcome, {profile?.full_name || user.email}! Manage users and permissions.
            </p>
          </div>

          {/* User Invitations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                User Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <InviteUserForm onInvitationSent={fetchInvitations} />
                
                {/* Pending Invitations */}
                <div>
                  <h3 className="font-semibold text-forest-green mb-4">Pending Invitations</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {invitations.filter(inv => inv.status === 'pending').map(invitation => (
                      <div key={invitation.id} className="p-3 bg-sage/10 rounded border border-sage/20">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{invitation.full_name}</p>
                            <p className="text-xs text-slate-gray">{invitation.email}</p>
                            <p className="text-xs text-forest-green">{invitation.role}</p>
                            <p className="text-xs text-slate-gray/70">
                              Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-600">Pending</span>
                            <button
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
                              title="Cancel invitation"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {invitations.filter(inv => inv.status === 'pending').length === 0 && (
                      <p className="text-sm text-slate-gray">No pending invitations</p>
                    )}
                  </div>
                  
                  {/* Cancelled/Expired Invitations */}
                  {invitations.filter(inv => inv.status !== 'pending' && inv.status !== 'accepted').length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-slate-gray mb-3">Recent Cancelled/Expired</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {invitations
                          .filter(inv => inv.status !== 'pending' && inv.status !== 'accepted')
                          .slice(0, 5)
                          .map(invitation => (
                          <div key={invitation.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-medium">{invitation.full_name}</p>
                                <p className="text-xs text-slate-gray">{invitation.email}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                invitation.status === 'cancelled' 
                                  ? 'bg-red-100 text-red-600' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {invitation.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* B2B Client Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green flex items-center gap-2">
                <Building className="h-5 w-5" />
                B2B Client Management
              </CardTitle>
              <p className="text-slate-gray text-sm">
                Overview of all client companies and their user counts.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead className="text-center">User Count</TableHead>
                      <TableHead>Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientCompanies.length > 0 ? (
                      clientCompanies.map((company) => (
                        <TableRow key={company.name}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell className="text-center">{company.userCount}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {company.users.slice(0, 3).map((email) => (
                                <span key={email} className="text-xs bg-sage/20 px-2 py-1 rounded">
                                  {email}
                                </span>
                              ))}
                              {company.users.length > 3 && (
                                <span className="text-xs text-slate-gray">
                                  +{company.users.length - 3} more
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-gray">
                          No client companies found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <p className="text-slate-gray text-sm">
                Real-time view of all authenticated user profiles with full management capabilities.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'No name set'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.client_name ? (
                            <span className="text-xs bg-forest-green/10 text-forest-green px-2 py-1 rounded">
                              {user.client_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-gray">No company</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.user_role === 'Admin' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-sage/20 text-forest-green'
                          }`}>
                            {user.user_role || 'Client'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit User</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="edit-name">Full Name</Label>
                                    <Input
                                      id="edit-name"
                                      value={editForm.full_name}
                                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                      placeholder="Enter full name"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-role">Role</Label>
                                    <Select
                                      value={editForm.role}
                                      onValueChange={(value) => setEditForm({...editForm, role: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Client">Client</SelectItem>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-company">Company Name</Label>
                                    <Input
                                      id="edit-company"
                                      value={editForm.client_name}
                                      onChange={(e) => setEditForm({...editForm, client_name: e.target.value})}
                                      placeholder="Enter company name"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setEditingUser(null)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={saveUserEdit}>
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(user.email)}
                              className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-gray">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Role-Based Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Menu & Access Control
              </CardTitle>
              <p className="text-slate-gray text-sm">
                Configure what each role can access and see in the application menu.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border border-sage/50 divide-y divide-sage/50">
                  <thead className="bg-sage/20">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-forest-green">Page</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Client Access</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Admin Access</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Client Menu</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Admin Menu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/30">
                    {Object.entries(permissionsByPage).map(([page, rolePerms]) => (
                      <tr key={page} className="hover:bg-sage/10">
                        <td className="px-3 py-2">
                          <code className="bg-sage/20 px-2 py-1 rounded text-xs">{page}</code>
                          {rolePerms['Client']?.menu_item && (
                            <div className="text-xs text-slate-gray/70 mt-1">
                              Menu: {rolePerms['Client'].menu_item}
                            </div>
                          )}
                        </td>
                        {['Client', 'Admin'].map(role => (
                          <td key={`${page}-${role}-access`} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={rolePerms[role]?.access || false}
                              onChange={(e) => {
                                if (rolePerms[role]) {
                                  updatePermission(rolePerms[role].id, 'access', e.target.checked);
                                }
                              }}
                              className="w-4 h-4 text-forest-green bg-white border-sage rounded focus:ring-forest-green"
                            />
                          </td>
                        ))}
                        {['Client', 'Admin'].map(role => (
                          <td key={`${page}-${role}-menu`} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={rolePerms[role]?.visible || false}
                              onChange={(e) => {
                                if (rolePerms[role]) {
                                  updatePermission(rolePerms[role].id, 'visible', e.target.checked);
                                }
                              }}
                              className="w-4 h-4 text-forest-green bg-white border-sage rounded focus:ring-forest-green"
                              disabled={!rolePerms[role]?.menu_item}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;