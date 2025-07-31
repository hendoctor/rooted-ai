import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Edit3, Plus, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

interface UserManagementTableProps {
  onUserUpdated?: () => void;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ onUserUpdated }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', role: '', full_name: '' });
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'Public', full_name: '' });

  const fetchUsers = async () => {
    try {
      const [usersResult, profilesResult] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      if (usersResult.error) throw usersResult.error;
      if (profilesResult.error) throw profilesResult.error;

      setUsers(usersResult.data || []);
      setProfiles(profilesResult.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscriptions
    const usersChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('Users change received!', payload);
          fetchUsers();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profiles change received!', payload);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      onUserUpdated?.();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      // Update user in users table
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          email: editForm.email,
          role: editForm.role 
        })
        .eq('id', selectedUser.id);

      if (userError) throw userError;

      // Update profile if exists
      const profile = profiles.find(p => p.user_id === selectedUser.id);
      if (profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            email: editForm.email,
            full_name: editForm.full_name || null
          })
          .eq('user_id', selectedUser.id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditDialogOpen(false);
      onUserUpdated?.();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: createForm.full_name
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user in users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: createForm.email,
            role: createForm.role
          });

        if (userError) throw userError;

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: createForm.email,
            full_name: createForm.full_name || null
          });

        if (profileError) throw profileError;
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });
      setCreateDialogOpen(false);
      setCreateForm({ email: '', password: '', role: 'Public', full_name: '' });
      onUserUpdated?.();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete from users table (will cascade to profiles due to foreign key)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeleteDialogOpen(false);
      onUserUpdated?.();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    const profile = profiles.find(p => p.user_id === user.id);
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      role: user.role,
      full_name: profile?.full_name || ''
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-green mx-auto mb-4"></div>
            <p className="text-slate-gray">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-forest-green">User Management</CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-forest-green hover:bg-forest-green/90">
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <Label htmlFor="create-full-name">Full Name</Label>
                <Input
                  id="create-full-name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="create-role">Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
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
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} className="bg-forest-green hover:bg-forest-green/90">
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                <th className="px-4 py-3 text-center text-sm font-medium text-forest-green">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/30">
              {users.map((user) => {
                const profile = profiles.find(p => p.user_id === user.id);
                return (
                  <tr key={user.id} className="hover:bg-sage/10">
                    <td className="px-4 py-3 text-slate-gray font-medium">
                      {profile?.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-gray">{user.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => updateUserRole(user.id, newRole)}
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
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={
                          user.role === 'Admin' ? 'destructive' :
                          user.role === 'Client' ? 'default' :
                          'secondary'
                        }
                        className={
                          user.role === 'Admin' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                          user.role === 'Client' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                          'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog(user)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-full-name">Full Name</Label>
                <Input
                  id="edit-full-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
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
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditUser} className="bg-forest-green hover:bg-forest-green/90">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user and their associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default UserManagementTable;