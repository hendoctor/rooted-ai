import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccessDenied from './AccessDenied';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const UserManagement = () => {
  const { user, userRole, profile, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Tables<'profiles'>[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (userRole === 'Admin') {
      fetchUsers();
    } else {
      setLoadingUsers(false);
    }
  }, [userRole]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setUsers(data ?? []);
    }
    setLoadingUsers(false);
  };


  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    // Keep profiles in sync if they store a role
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);
    
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-forest-green">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/30">
                    {users.map((u: Tables<'profiles'>) => (
                      <tr key={u.id} className="hover:bg-sage/10">
                        <td className="px-4 py-3 text-slate-gray font-medium">
                          {u.full_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-gray">{u.email}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => updateUserRole(u.user_id, newRole)}
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
                          <Badge 
                            variant={
                              u.role === 'Admin' ? 'destructive' :
                              u.role === 'Client' ? 'default' :
                              'secondary'
                            }
                            className={
                              u.role === 'Admin' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                              u.role === 'Client' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                              'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                          >
                            {u.role}
                          </Badge>
                        </td>
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

export default UserManagement;
