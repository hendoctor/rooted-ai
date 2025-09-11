import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthManager } from '@/hooks/useAuthManager';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const authManager = useAuthManager();
  const { toast } = useToast();
  const { user, authReady, userRole, companies } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (authReady && user && userRole) {
      if (userRole === 'Admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'Client') {
        if (companies.length > 0) {
          navigate(`/${companies[0].slug}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, authReady, userRole, companies, navigate]);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setShowNewPassword(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await authManager.actions.signIn(email, password);
    if (error) {
      toast({
        title: 'Login Failed',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({
        title: 'Password Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated.',
      });
      navigate('/auth');
      setShowNewPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-background">
        {showNewPassword ? (
          <Card className="w-full max-w-md border-sage/30 shadow-lg">
            <CardHeader className="flex flex-col items-center space-y-2">
              <img
                src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                alt="RootedAI Logo"
                className="w-16 h-16"
              />
              <CardTitle className="text-2xl font-bold text-forest-green">
                Set New Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-slate-gray mb-2"
                  >
                    New Password
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-new-password"
                    className="block text-sm font-medium text-slate-gray mb-2"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-forest-green hover:bg-forest-green/90"
                  disabled={authManager.state.loading}
                >
                  {authManager.state.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md border-sage/30 shadow-lg">
            <CardHeader className="flex flex-col items-center space-y-2">
              <img
                src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                alt="RootedAI Logo"
                className="w-16 h-16"
              />
              <CardTitle className="text-2xl font-bold text-forest-green">
                Sign In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-gray mb-2"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-gray mb-2"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Enter your password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-forest-green hover:bg-forest-green/90"
                  disabled={authManager.state.loading}
                >
                  {authManager.state.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;

