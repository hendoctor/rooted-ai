import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Bug, User, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserDebugData {
  id: string;
  email: string;
  role: string;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    userRole: string;
    isAdmin: boolean;
  }>;
  permissions: {
    pages: Record<string, boolean>;
    actions: Record<string, boolean>;
    capabilities: Record<string, boolean>;
  };
}

interface AuthUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: string;
  display_name: string | null;
}

const AdminPermissionDebugger: React.FC = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [debugData, setDebugData] = useState<UserDebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, email, role, display_name')
        .order('email', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRefresh = () => {
    fetchUsers();
    toast({
      title: 'Users refreshed',
      description: 'Latest users loaded',
    });
  };

  const fetchUserDebugData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch user profile data using the same RPC function
      const { data, error } = await supabase.rpc('get_user_profile', {
        p_user_id: userId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setDebugData(null);
        return;
      }

      const profileData = data[0];
      const user = users.find(u => u.auth_user_id === userId);
      
      if (!user) return;

      // Parse companies from jsonb
      let companiesData = [];
      if (profileData.companies && Array.isArray(profileData.companies)) {
        companiesData = profileData.companies.map((company: any) => ({
          id: company.id,
          name: company.name,
          slug: company.slug,
          userRole: company.userRole,
          isAdmin: company.isAdmin
        }));
      }

      // Simulate permission checks (in a real app you'd call the permission functions)
      const permissions = {
        pages: {
          'client-portal': ['Client', 'Admin'].includes(profileData.user_role || 'Client'),
          'profile': ['Client', 'Admin'].includes(profileData.user_role || 'Client'),
          'dashboard': profileData.user_role === 'Admin',
          'admin': profileData.user_role === 'Admin'
        },
        actions: {
          'companies-read': ['Client', 'Admin'].includes(profileData.user_role || 'Client'),
          'companies-update': profileData.user_role === 'Admin' || companiesData.some((c: any) => c.isAdmin),
          'client-portal-read': ['Client', 'Admin'].includes(profileData.user_role || 'Client'),
          'users-manage': profileData.user_role === 'Admin'
        },
        capabilities: {
          'canManageCompanies': profileData.user_role === 'Admin' || companiesData.some((c: any) => c.isAdmin),
          'canViewReports': profileData.user_role === 'Admin',
          'isClient': profileData.user_role === 'Client' || companiesData.length > 0,
          'isAdmin': profileData.user_role === 'Admin'
        }
      };

      setDebugData({
        id: user.id,
        email: user.email,
        role: profileData.user_role || 'Client',
        companies: companiesData,
        permissions
      });
      
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        fetchUserDebugData(user.auth_user_id);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2 text-forest-green">
            <Bug className="h-5 w-5" />
            Permission Debugger
          </CardTitle>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="w-full lg:w-auto text-forest-green border-forest-green hover:bg-forest-green/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedUserId} onValueChange={handleUserSelect}>
              <SelectTrigger className="w-full bg-background border border-border">
                <SelectValue placeholder="Select a user to debug..." />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.email}</span>
                      <Badge variant="outline" className="ml-2">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <LoadingSpinner text="Loading user permissions..." />
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background">
              <DialogHeader>
                <DialogTitle>
                  Permission Debug: {debugData?.email}
                </DialogTitle>
              </DialogHeader>
              
              {debugData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-forest-green">User Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p><strong>Email:</strong> {debugData.email}</p>
                        <p><strong>Role:</strong> <Badge>{debugData.role}</Badge></p>
                        <p><strong>Companies:</strong> {debugData.companies.length}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-forest-green">Page Access</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(debugData.permissions.pages).map(([page, hasAccess]) => (
                          <p key={page}>
                            <strong>{page}:</strong> {hasAccess ? '✅' : '❌'}
                          </p>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-forest-green">Action Permissions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(debugData.permissions.actions).map(([action, canPerform]) => (
                          <p key={action}>
                            <strong>{action}:</strong> {canPerform ? '✅' : '❌'}
                          </p>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-forest-green">Capabilities</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {Object.entries(debugData.permissions.capabilities).map(([capability, hasCapability]) => (
                          <p key={capability}>
                            <strong>{capability}:</strong> {hasCapability ? '✅' : '❌'}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {debugData.companies.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-forest-green">Company Memberships</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {debugData.companies.map((company, index) => (
                            <div key={company.id} className="p-3 border rounded-lg">
                              <h4 className="font-semibold">{company.name}</h4>
                              <p className="text-sm text-muted-foreground">Slug: {company.slug}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">{company.userRole}</Badge>
                                {company.isAdmin && <Badge>Admin</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPermissionDebugger;