import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import AccessDenied from './AccessDenied';

const Admin = () => {
  const { user, userRole, profile, loading } = useAuth();
  const [perms, setPerms] = useState<Tables<'role_permissions'>[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'Admin') {
      supabase
        .from('role_permissions')
        .select('*')
        .then(({ data, error }) => {
          if (!error) setPerms(data ?? []);
          setPermsLoading(false);
        });
    } else {
      setPermsLoading(false);
    }
  }, [userRole]);

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
      setPerms((p) => p.map((perm) => (perm.id === id ? { ...perm, [field]: value } : perm)));
    } else {
      console.error('Failed to update permission', error);
    }
  };

  if (loading || permsLoading) {
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
    <div className="min-h-screen">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
            <p className="text-slate-gray mb-6">
              Welcome, {profile?.full_name || user.email}! You have <span className="font-semibold">{userRole}</span> access.
            </p>
          </div>

          {/* Role Permissions Management */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-sage/20 p-6">
            <h2 className="text-2xl font-bold text-forest-green mb-4">Role Permissions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-sage divide-y divide-sage">
                <thead className="bg-sage/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-forest-green">Role</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-forest-green">Page</th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Access</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-forest-green">Menu Item</th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-forest-green">Visible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {perms.map((p) => (
                    <tr key={p.id} className="hover:bg-sage/10">
                      <td className="px-3 py-2 text-sm text-slate-gray">{p.role}</td>
                      <td className="px-3 py-2 text-sm text-slate-gray">{p.page}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={p.access}
                          onChange={(e) => updatePermission(p.id, 'access', e.target.checked)}
                          className="rounded border-sage text-forest-green focus:ring-forest-green"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-gray">{p.menu_item || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={p.visible}
                          onChange={(e) => updatePermission(p.id, 'visible', e.target.checked)}
                          className="rounded border-sage text-forest-green focus:ring-forest-green"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
