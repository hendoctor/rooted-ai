import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthOptimized';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit2, Users, Building2, Mail, Crown, UserPlus, X, ExternalLink, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LoadingSpinner, InlineLoader } from '@/components/LoadingSpinner';
import InviteUserForm from '@/components/InviteUserForm';
import AccessDenied from './AccessDenied';

interface UserWithRole {
  id: string;
  auth_user_id: string;
  email: string;
  role: 'Client' | 'Admin';
  client_name: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  companies?: Array<{
    id: string;
    name: string;
    slug: string;
    userRole: string;
  }>;
}

interface CompanyWithCount {
  id: string;
  name: string;
  slug: string;
  userCount: number;
}

interface NewsletterSubscription {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at?: string;
  source: string;
}

const AdminDashboard: React.FC = () => {
  const { user, loading, role, isAdmin } = useAuth();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyWithCount[]>([]);
  const [newsletterSubscriptions, setNewsletterSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    client_name: '',
    role: 'Client' as 'Client' | 'Admin',
    companyId: '',
    companyRole: 'Member' as 'Member' | 'Admin'
  });
  const { toast } = useToast();

  // Simplified: Just fetch data when authenticated admin
  useEffect(() => {
    if (loading) return;
    
    if (!user || !isAdmin) {
      setLoadingData(false);
      return;
    }
    
    fetchAllData();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [user, loading, isAdmin]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchUsersWithRoles(),
      fetchInvitations(),
      fetchAllCompanies()
    ]);
    setLoadingData(false);
  };

  const fetchUsersWithRoles = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, auth_user_id, email, role, client_name, display_name, created_at, updated_at')
        .order('created_at', { ascending: false });
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      // Type-cast the role to ensure it matches our interface
      const typedUsers: UserWithRole[] = (usersData || []).map(user => ({
        ...user,
        role: user.role as 'Client' | 'Admin',
        client_name: user.client_name || 'N/A',
        companies: [] // We'll fetch company memberships separately if needed
      }));

      setUsersWithRoles(typedUsers);
    } catch (error) {
      console.error('Error in fetchUsersWithRoles:', error);
    }
  };

  // Role permissions are now managed directly in users table - no separate fetch needed

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setInvitations(data ?? []);
    }
  };

  const fetchAllCompanies = async () => {
    try {
      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name', { ascending: true });
      
      if (companiesError || !companiesData) {
        console.error('Error fetching companies:', companiesError);
        toast({
          title: "Error",
          description: "Failed to fetch companies. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const { count, error } = await supabase
            .from('company_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          
          return {
            id: company.id,
            name: company.name,
            slug: company.slug,
            userCount: error ? 0 : (count || 0)
          };
        })
      );
      
      setAllCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error in fetchAllCompanies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies. Please try again.",
        variant: "destructive"
      });
    }
  };

  const fetchNewsletterSubscriptions = async () => {
    // Newsletter subscriptions temporarily disabled until types are updated
    setNewsletterSubscriptions([]);
  };

  const setupRealtimeSubscriptions = () => {
    const adminChannel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsersWithRoles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_invitations' }, () => {
        fetchInvitations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        fetchAllCompanies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_memberships' }, () => {
        fetchUsersWithRoles();
        fetchAllCompanies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  };

  const updateUserRole = async (userEmail: string, newRole: 'Client' | 'Admin') => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('email', userEmail);
    
    if (!error) {
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
      fetchUsersWithRoles();
    } else {
      toast({
        title: "Error", 
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  // Permission management is now handled directly through users.role field

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);
    
    if (!error) {
      toast({
        title: "Success",
        description: "Invitation cancelled successfully",
      });
      fetchInvitations();
    } else {
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive"
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
      fetchUsersWithRoles();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    const primaryCompany = user.companies?.[0];
    setEditForm({
      display_name: user.display_name || '',
      client_name: user.client_name || '',
      role: user.role,
      companyId: primaryCompany?.id || '',
      companyRole: primaryCompany?.userRole as 'Member' | 'Admin' || 'Member'
    });
  };

  const createMissingProfile = async (user: UserWithRole) => {
    if (!user.display_name) {
      const defaultDisplayName = user.email.split('@')[0];
      
      const { error } = await supabase
        .from('users')
        .update({ display_name: defaultDisplayName })
        .eq('id', user.id);

      if (!error) {
        fetchUsersWithRoles();
        toast({
          title: "Profile Created",
          description: `Created profile for ${user.email} with display name: ${defaultDisplayName}`,
        });
      }
    }
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      // Update user info
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name,
          client_name: editForm.client_name,
          role: editForm.role
        })
        .eq('id', editingUser.id);

      if (userError) throw userError;

      // Update company membership if selected
      if (editForm.companyId) {
        const { error: membershipError } = await supabase
          .from('company_memberships')
          .upsert({
            user_id: editingUser.auth_user_id,
            company_id: editForm.companyId,
            role: editForm.companyRole
          });

        if (membershipError) throw membershipError;
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      });
      
      setEditingUser(null);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const removeUserFromCompany = async (userId: string, companyId: string) => {
    try {
      const { error } = await supabase
        .from('company_memberships')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from company"
      });
      
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing user from company:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from company",
        variant: "destructive"
      });
    }
  };

  const toggleNewsletterSubscription = async (subscription: NewsletterSubscription) => {
    // Newsletter subscription management temporarily disabled until types are updated
    toast({
      title: "Info",
      description: "Newsletter management will be available once database types are updated",
    });
  };

  if (loading || loadingData) {
    console.log('AdminDashboard: Loading state - loading:', loading, 'loadingData:', loadingData);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user || !isAdmin) {
    console.log('AdminDashboard: Access denied - user:', !!user, 'role:', role, 'isAdmin:', isAdmin);
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8 mt-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive management interface for users, companies, invitations, and settings.
          </p>
        </div>

        {/* Company Portals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Portals
            </CardTitle>
            <CardDescription>
              Access and manage all registered company portals and their user counts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading companies..." />
            ) : allCompanies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No companies found.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allCompanies.map((company) => (
                  <Card key={company.id} className="border border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>/{company.slug}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {company.userCount} user{company.userCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/company/${company.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Portal
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Invitations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              User Invitations
            </CardTitle>
            <CardDescription>
              Send invitations and manage pending requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <InviteUserForm onInvitationSent={fetchInvitations} />
              
              <div>
                <h3 className="font-semibold mb-4">Pending Invitations</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {invitations.filter(inv => inv.status === 'pending').map(invitation => (
                    <div key={invitation.id} className="p-3 bg-muted rounded border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{invitation.full_name}</p>
                          <p className="text-xs text-muted-foreground">{invitation.email}</p>
                          <p className="text-xs">{invitation.role}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvitation(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invitations.filter(inv => inv.status === 'pending').length === 0 && (
                    <p className="text-sm text-muted-foreground">No pending invitations</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Real-time view of all authenticated user profiles with full management capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <InlineLoader text="Loading users..." />
            ) : usersWithRoles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Company Memberships</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithRoles.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
                          {user.role === 'Admin' && <Crown className="h-3 w-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.display_name || 'Not set'}</TableCell>
                      <TableCell>
                        {user.companies && user.companies.length > 0 ? (
                          <div className="space-y-1">
                            {user.companies.map((company, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {company.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({company.userRole})
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1"
                                  onClick={() => removeUserFromCompany(user.auth_user_id, company.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{user.client_name || 'No company'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {!user.display_name && (
                            <Button variant="outline" size="sm" onClick={() => createMissingProfile(user)}>
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => deleteUser(user.email)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Role-Based Access Control is now simplified */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Role-Based Access Control
            </CardTitle>
            <CardDescription>
              Access control is now managed directly through user roles in the users table. 
              Admins have full access, Clients have access to their company portals and profiles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Admin Role</h4>
                <p className="text-sm text-muted-foreground">
                  Full access to admin dashboard, public menu items, and all system features.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Client Role</h4>
                <p className="text-sm text-muted-foreground">
                  Access to their company portal and profile. Public menu items are hidden when authenticated.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and company assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="display_name" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client_name" className="text-right">
                  Client Name
                </Label>
                <Input
                  id="client_name"
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select value={editForm.role} onValueChange={(value: 'Client' | 'Admin') => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Select value={editForm.companyId} onValueChange={(value) => setEditForm({ ...editForm, companyId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No company</SelectItem>
                      {allCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyRole">Company Role</Label>
                  <Select value={editForm.companyRole} onValueChange={(value: 'Member' | 'Admin') => setEditForm({ ...editForm, companyRole: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={saveUserEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Newsletter Subscriptions Section - Temporarily Disabled */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Newsletter Subscriptions
            </CardTitle>
            <CardDescription>
              Newsletter management will be available once database types are updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Newsletter subscription management is being set up and will be available soon.
            </p>
          </CardContent>
        </Card>

      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;