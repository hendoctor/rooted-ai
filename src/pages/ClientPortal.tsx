import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthReliable';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, FileText, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CompanyUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const ClientPortal = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user, companies, loading: authLoading } = useAuth();
  const clientName = companies.find(c => c.slug === companySlug)?.name;
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const getCompanySlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  useEffect(() => {
  const checkAccessAndFetchData = async () => {
      if (authLoading || !user) return;

      // Get current user's role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, client_name')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const userRole = userData.role;
      const userClientName = userData.client_name;

      // Admin has access to all company portals
      if (userRole === 'Admin') {
        // Find company by slug for admin access
        const targetCompany = companies.find(c => c.slug === companySlug);
        if (!targetCompany) {
          console.error('Company not found for slug:', companySlug);
          setHasAccess(false);
          setLoading(false);
          return;
        }
        setHasAccess(true);
        
        // Fetch all users for this company (admin can see all)
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, email, role, created_at, client_name, display_name')
            .eq('client_name', targetCompany.name);

          if (!error && data) {
            setCompanyUsers(data);
          } else {
            console.error('Error fetching company users for admin:', error);
          }
        } catch (error) {
          console.error('Error fetching company users:', error);
        }
      } else if (userRole === 'Client') {
        // Client can only access their own company portal
        const userCompany = companies.find(c => 
          c.slug === companySlug && c.name === userClientName
        );
        
        if (!userCompany) {
          console.error('Client does not have access to company:', companySlug);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setHasAccess(true);

        // Fetch users from the same company (client can only see their company)
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, email, role, created_at, client_name, display_name')
            .eq('client_name', userClientName);

          if (!error && data) {
            setCompanyUsers(data);
          } else {
            console.error('Error fetching company users for client:', error);
          }
        } catch (error) {
          console.error('Error fetching company users:', error);
        }
      } else {
        // Public or other roles don't have access
        setHasAccess(false);
      }

      setLoading(false);
    };

    checkAccessAndFetchData();
  }, [user, companies, companySlug, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-warm-beige dark:bg-slate-900">
        <Header />
        <div className="pt-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-slate-gray dark:text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-warm-beige dark:bg-slate-900">
        <Header />
        <div className="pt-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-forest-green mb-4">Access Denied</h1>
            <p className="text-slate-gray dark:text-white mb-6">
              You don't have access to this company portal.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center text-forest-green hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-beige dark:bg-slate-900">
      <Header />
      <div className="pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <Link 
            to="/" 
            className="inline-flex items-center text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-sage mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building className="h-8 w-8 text-forest-green" />
              <h1 className="text-3xl font-bold text-forest-green">{clientName}</h1>
            </div>
            <p className="text-slate-gray dark:text-slate-400">
              Welcome to your company portal. Manage your team and access company resources.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Company Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray dark:text-slate-400">Company Name:</span>
                    <span className="text-sm font-medium">{clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray dark:text-slate-400">Team Members:</span>
                    <span className="text-sm font-medium">{companyUsers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray dark:text-slate-400">Your Role:</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {companyUsers.map((member) => (
                    <div key={member.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{member.email}</p>
                        <p className="text-xs text-slate-gray dark:text-slate-400">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link 
                    to="/profile" 
                    className="block p-3 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="text-sm font-medium">Manage Profile</span>
                    </div>
                  </Link>
                  <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Company Documents</span>
                    </div>
                    <p className="text-xs text-slate-gray dark:text-slate-400 mt-1">Coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Resources Section */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Company Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-gray dark:text-white mb-2">
                    Company-Specific Content
                  </h3>
                  <p className="text-slate-gray dark:text-slate-400 mb-4">
                    This section will contain resources and content specific to {clientName}.
                  </p>
                  <p className="text-sm text-slate-gray dark:text-slate-400">
                    Content management features coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;