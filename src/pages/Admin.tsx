import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import AccessDenied from './AccessDenied';

const Admin = () => {
  const { user, userRole, profile, loading } = useAuth();

  if (loading) {
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
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
          <p className="text-slate-gray mb-6">
            Welcome, {profile?.full_name || user.email}! You have <span className="font-semibold">{userRole}</span> access.
          </p>
          <div className="border border-sage/50 p-6 rounded-lg text-slate-gray">
            <p className="mb-2">Placeholder for admin tools.</p>
            <p>Manage users or view reports here.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
