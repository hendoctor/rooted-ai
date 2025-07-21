import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { NotificationDebugger } from '@/components/NotificationDebugger';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const [showStats, setShowStats] = useState(false);

  if (loading) return null;

  if (!user || profile?.role !== 'admin') {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-6">
          <h1 className="text-3xl font-bold text-forest-green mb-4">Admin Dashboard</h1>
          <p className="text-slate-gray">
            Welcome, {profile?.full_name || user.email}! This page is only visible to administrators.
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Admin Controls</h2>
            <Button onClick={() => setShowStats((s) => !s)} variant="outline" size="sm">
              {showStats ? 'Hide Debug Stats' : 'Show Debug Stats'}
            </Button>
            {showStats && (
              <div className="pt-4">
                <NotificationDebugger />
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
