import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccessDenied from './AccessDenied';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import UserRoleManager from '@/components/UserRoleManager';
import SecurityAuditDisplay from '@/components/SecurityAuditDisplay';
import InviteUserForm from '@/components/InviteUserForm';
import InvitationsTable from '@/components/InvitationsTable';

const UserManagement = () => {
  const { user, userRole, profile, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Tables<'users'>[]>([]);
  const [perms, setPerms] = useState<Tables<'role_permissions'>[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (userRole === 'Admin') {
      fetchUsers();
      fetchPermissions();
    } else {
      setLoadingUsers(false);
    }
  }, [userRole]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setUsers(data ?? []);
    }
    setLoadingUsers(false);
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role', { ascending: true });
    
    if (!error) {
      setPerms(data ?? []);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };


  const updatePermission = async (
    id: string,
    field: 'access' | 'visible',
    value: boolean
  ) => {
    const { error } = await supabase
      .from('role_permissions')
      .update({ [field]: value })
      .eq('id', id);
    
    if (!error) {
      setPerms(perms.map(perm => perm.id === id ? { ...perm, [field]: value } : perm));
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

  if (loading || loadingUsers) {
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
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
            <p className="text-slate-gray mb-6">
              Welcome, {profile?.full_name || user.email}! You have <span className="font-semibold">{userRole}</span> access.
            </p>
          </div>

          {/* Security Audit */}
          <SecurityAuditDisplay />

          {/* User Invitation System */}
          <div className="grid md:grid-cols-2 gap-8">
            <InviteUserForm onInvitationSent={fetchUsers} />
            <InvitationsTable />
          </div>

          {/* User Management */}
          <UserRoleManager onUserUpdated={fetchUsers} />

          {/* Current Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green">Current Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border border-sage/50 divide-y divide-sage/50">
                  <thead className="bg-sage/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/30">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-sage/10">
                        <td className="px-4 py-3 text-slate-gray">{u.email}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => updateUserRole(u.id, newRole)}
                          >
                            <SelectTrigger className="w-24">
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
                          {new Date(u.created_at!).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            u.role === 'Admin' ? 'bg-red-100 text-red-800' :
                            u.role === 'Client' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Role-Based Menu & Page Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="text-forest-green">Role-Based Access Control</CardTitle>
              <p className="text-slate-gray text-sm">
                Configure what each role can access and see in the application menu. Only active pages with valid routes are shown.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border border-sage/50 divide-y divide-sage/50">
                  <thead className="bg-sage/20">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-forest-green">Page</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Public Access</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Client Access</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Admin Access</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Public Menu</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Client Menu</th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Admin Menu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/30">
                    {(() => {
                      // Group permissions by page
                      const activePages = ['/', '/admin', '/auth'];
                      const filteredPerms = perms.filter(p => activePages.includes(p.page));
                      const pageGroups = filteredPerms.reduce((acc, perm) => {
                        if (!acc[perm.page]) {
                          acc[perm.page] = {};
                        }
                        acc[perm.page][perm.role] = perm;
                        return acc;
                      }, {} as Record<string, Record<string, typeof perms[0]>>);
                      
                      const roles = ['Public', 'Client', 'Admin'];
                      
                      return Object.entries(pageGroups).map(([page, rolePerms]) => (
                        <tr key={page} className="hover:bg-sage/10">
                          <td className="px-3 py-2 text-slate-gray font-medium">
                            <div className="flex flex-col">
                              <code className="bg-sage/20 px-2 py-1 rounded text-xs">{page}</code>
                              {rolePerms[roles[0]]?.menu_item && (
                                <span className="text-xs text-slate-gray/70 mt-1">
                                  Menu: {rolePerms[roles[0]].menu_item}
                                </span>
                              )}
                            </div>
                          </td>
                          {roles.map(role => (
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
                          {roles.map(role => (
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
                      ));
                    })()}
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

export default UserManagement;