import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import NotFound from './NotFound';

const Admin = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user || profile?.role !== 'admin') {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
          <p className="text-slate-gray">
            Welcome, {profile?.full_name || user.email}! This page is only visible to administrators.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
