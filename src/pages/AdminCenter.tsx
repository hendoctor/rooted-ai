import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccessDenied from './AccessDenied';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const AdminCenter = () => {
  const { user, userRole } = useAuth();
  const [perms, setPerms] = useState<Tables<'role_permissions'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'Admin') {
      supabase
        .from('role_permissions')
        .select('*')
        .then(({ data, error }) => {
          if (!error) setPerms(data ?? []);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const update = async (
    id: string,
    field: 'access' | 'visible',
    value: boolean
  ) => {
    const { data, error } = await supabase
      .from('role_permissions')
      .update({ [field]: value })
      .eq('id', id)
      .single();
    if (!error && data) {
      setPerms((p) => p.map((perm) => (perm.id === id ? data : perm)));
    } else if (error) {
      console.error('Failed to update permission', error);
    }
  };

  if (loading) return null;
  if (!user || userRole !== 'Admin') return <AccessDenied />;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-6">
          <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Center</h1>
          <table className="min-w-full border border-sage divide-y divide-sage">
            <thead className="bg-sage/20">
              <tr>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Page</th>
                <th className="px-3 py-2">Access</th>
                <th className="px-3 py-2">Menu Item</th>
                <th className="px-3 py-2">Visible</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.role}</td>
                  <td className="px-3 py-2">{p.page}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p.access}
                      onChange={(e) => update(p.id, 'access', e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2">{p.menu_item || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p.visible}
                      onChange={(e) => update(p.id, 'visible', e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminCenter;
