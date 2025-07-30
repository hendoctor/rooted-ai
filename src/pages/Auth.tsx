import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if this is a password recovery flow
    const type = searchParams.get('type');
    const inviteToken = searchParams.get('invite');
    
    if (type === 'recovery') {
      setShowNewPassword(true);
    }

    // Load invitation if present
    if (inviteToken) {
      loadInvitation(inviteToken);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to home
        if (session?.user && type !== 'recovery') {
          navigate('/');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user && type !== 'recovery') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const loadInvitation = async (token: string) => {
    setLoadingInvitation(true);
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString()) // Enhanced expiration check
        .maybeSingle();

      if (error || !data) {
        // Log invalid invitation attempt for security monitoring
        await supabase.rpc('log_security_event', {
          event_type: 'invalid_invitation_access',
          event_details: { 
            token: token.substring(0, 8) + '...', // Log partial token for security
            ip_address: window.location.hostname,
            user_agent: navigator.userAgent 
          }
        });
        
        toast({
          title: "Invalid Invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive",
        });
        return;
      }

      setInvitation(data);
      setEmail(data.email);
      setFullName(data.full_name);
      setIsLogin(false); // Switch to signup mode
      
      // Log successful invitation access
      await supabase.rpc('log_security_event', {
        event_type: 'invitation_accessed',
        event_details: { 
          invitation_id: data.id,
          invited_email: data.email,
          invited_role: data.role
        }
      });
      
      toast({
        title: "Invitation Found!",
        description: `Welcome ${data.full_name}! Complete your account setup below.`,
      });
    } catch (error: any) {
      console.error('Failed to load invitation:', error);
      toast({
        title: "Error",
        description: "Failed to load invitation details.",
        variant: "destructive",
      });
    } finally {
      setLoadingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
              invited_role: invitation?.role, // Include role if from invitation
            }
          }
        });

        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // If this is from an invitation, mark it as accepted
          if (invitation && data.user) {
            try {
              await supabase
                .from('user_invitations')
                .update({ 
                  status: 'accepted',
                  accepted_at: new Date().toISOString()
                })
                .eq('id', invitation.id);

              // Set the user role immediately
              await supabase
                .from('profiles')
                .update({ role: invitation.role })
                .eq('user_id', data.user.id);

              toast({
                title: "Welcome to the team!",
                description: `Your account has been created with ${invitation.role} access.`,
              });
            } catch (inviteError) {
              console.error('Failed to process invitation:', inviteError);
            }
          } else {
            toast({
              title: "Account Created!",
              description: "Please check your email to verify your account.",
            });
          }
        }
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Please check your email for password reset instructions.",
        });
        setShowResetPassword(false);
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced password validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      toast({
        title: "Password Too Weak",
        description: "Password must contain uppercase, lowercase, numbers, and special characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Password Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        navigate('/');
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showNewPassword) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-forest-green">Set New Password</h2>
            <p className="mt-2 text-slate-gray">
              Enter your new password below.
            </p>
          </div>

          <Card className="border-sage/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-forest-green text-center">
                New Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewPassword} className="space-y-6">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-gray mb-2">
                    New Password *
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-gray mb-2">
                    Confirm Password *
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-forest-green">Reset Your Password</h2>
            <p className="mt-2 text-slate-gray">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <Card className="border-sage/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-forest-green text-center">
                Password Reset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-gray mb-2">
                    Email Address *
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="your.email@company.com"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-forest-green hover:text-forest-green/80 font-medium"
                >
                  Back to login
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-forest-green">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-slate-gray">
            {isLogin ? 'Access your RootedAI dashboard' : 'Join RootedAI today'}
          </p>
        </div>

        <Card className="border-sage/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-forest-green text-center">
              {isLogin ? 'Login' : invitation ? 'Complete Your Invitation' : 'Sign Up'}
            </CardTitle>
            {invitation && (
              <div className="text-center mt-2">
                <div className="bg-forest-green/10 border border-forest-green/20 rounded-lg p-3">
                  <p className="text-sm text-forest-green">
                    <strong>Invited as:</strong> {invitation.role}
                  </p>
                  <p className="text-xs text-slate-gray mt-1">
                    Welcome {invitation.full_name}! Create your password to complete signup.
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-gray mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    disabled={!!invitation}
                    className={`border-sage/50 focus:border-forest-green ${invitation ? 'bg-sage/20' : ''}`}
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-gray mb-2">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!invitation}
                  className={`border-sage/50 focus:border-forest-green ${invitation ? 'bg-sage/20' : ''}`}
                  placeholder="your.email@company.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-gray">
                    Password *
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-sm text-forest-green hover:text-forest-green/80 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-sage/50 focus:border-forest-green"
                  placeholder="Your password"
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-forest-green hover:text-forest-green/80 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;