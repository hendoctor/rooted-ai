import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength } from '@/utils/securityConfig';
import { useAuth } from '@/hooks/useAuth';
import { useAuthManager } from '@/hooks/useAuthManager';
import RootedBackground from '@/components/RootedBackground';

const AuthSimplified = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, authReady, userRole, companies } = useAuth();
  const authManager = useAuthManager();

  // Enhanced navigation logic for authenticated users
  useEffect(() => {
    if (authReady && user && userRole) {
      console.log('✅ User authenticated, navigating based on role:', userRole);
      
      // Navigate based on user role
      if (userRole === 'Admin') {
        navigate('/admin', { replace: true });
        return;
      }

      if (userRole === 'Client') {
        if (companies.length > 0) {
          navigate(`/${companies[0].slug}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
        return;
      }

      // Default fallback
      navigate('/', { replace: true });
    }
  }, [user, authReady, userRole, companies, navigate]);

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
  }, [searchParams]);

  const loadInvitation = async (token: string) => {
    setLoadingInvitation(true);
    setInvitationError(null);
    
    try {
      console.log(`Loading invitation for token: ${token.substring(0, 8)}...`);
      
      const { data, error } = await supabase.rpc('validate_invitation_secure', {
        token_input: token
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const validationResult = data as { valid: boolean; error?: string; invitation?: any };

      if (!validationResult?.valid) {
        const errorMsg = validationResult?.error || "This invitation link is invalid or has expired.";
        setInvitationError(errorMsg);
        
        toast({
          title: "Invalid Invitation",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      const invitation = validationResult.invitation;
      setInvitation(invitation);
      setEmail(invitation.email);
      setFullName(invitation.full_name);
      setIsLogin(false);
      
      toast({
        title: "Invitation Found!",
        description: `Welcome ${invitation.full_name}! Complete your account setup below.`,
      });
      
    } catch (error: any) {
      console.error('Failed to load invitation:', error);
      setInvitationError(error.message || "Failed to load invitation details.");
      
      toast({
        title: "Error",
        description: "Failed to load invitation details. Please check the link and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingInvitation(false);
    }
  };

  const validatePassword = (password: string) => {
    const validation = validatePasswordStrength(password);
    setPasswordErrors(validation.errors);
    
    if (password.length === 0) {
      setPasswordStrength(null);
    } else if (validation.errors.length > 2) {
      setPasswordStrength('weak');
    } else if (validation.errors.length > 0) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
    
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For invitation signup, validate both password strength and confirmation
    if (invitation) {
      if (!validatePassword(password)) {
        toast({
          title: "Password Validation Failed",
          description: "Please fix the password requirements below.",
          variant: "destructive",
        });
        return;
      }
      
      if (password !== confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please check both password fields.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (!invitation) {
        // Simple login flow using auth manager
        console.log('🔐 Attempting sign-in...');
        const { error } = await authManager.actions.signIn(email, password);

        if (error) {
          toast({
            title: "Login Failed",
            description: error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });
          // Navigation will be handled by the auth state change in App.tsx
        }
      } else {
        // Invitation signup flow
        console.log('📝 Attempting invitation signup...');
        const { error } = await authManager.actions.signUp(email, password, {
          full_name: invitation.full_name,
          invitation_token: invitation.invitation_token
        });

        if (error) {
          // Handle existing user case
          if (error.toLowerCase().includes('already registered')) {
            const { error: signInError } = await authManager.actions.signIn(email, password);
            
            if (signInError) {
              toast({
                title: 'Sign In Failed',
                description: signInError,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Welcome back!',
                description: 'Signed in successfully with existing account.',
              });
            }
            return;
          }

          toast({
            title: 'Registration Failed', 
            description: error,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Account Created!',
            description: 'Please check your email to confirm your account.',
          });
        }
      }
    } catch (error: unknown) {
      console.error('Unexpected error during submit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
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
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePasswordStrength(newPassword).isValid) {
      const errors = validatePasswordStrength(newPassword).errors;
      toast({
        title: "Password Too Weak",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

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
    }
  };

  // Show loading state while checking invitation
  if (loadingInvitation) {
    return (
      <RootedBackground>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-muted-foreground">Loading invitation...</div>
          </div>
        </div>
      </RootedBackground>
    );
  }

  if (showNewPassword) {
    return (
      <RootedBackground>
        <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md border-sage/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-forest-green text-center">
                Set New Password
              </CardTitle>
              <CardDescription className="text-center text-slate-gray mt-2">
                Enter your new password below.
              </CardDescription>
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
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={8}
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
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </RootedBackground>
    );
  }

  if (showResetPassword) {
    return (
      <RootedBackground>
        <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md border-sage/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-forest-green text-center">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center text-slate-gray mt-2">
                Enter your email address and we'll send you a reset link.
              </CardDescription>
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
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-forest-green hover:bg-forest-green/90"
                      disabled={authManager.state.loading}
                    >
                      {authManager.state.loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending Reset Link...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-sage/50"
                      onClick={() => setShowResetPassword(false)}
                    >
                      Back to Sign In
                    </Button>
                  </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </RootedBackground>
    );
  }

  return (
    <RootedBackground>
      <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-sage/30 shadow-lg">
        <CardHeader className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <img
              src="/Assets/22badab3-8f25-475f-92d7-167cbc732868.png"
              alt="RootedAI logo"
              className="h-8 w-8"
            />
            <CardTitle className="text-xl text-forest-green">
              {invitation ? 'Account Setup' : (isLogin ? 'Welcome back to RootedAI!' : 'Create Your RootedAI Account')}
            </CardTitle>
          </div>
          <CardDescription className="text-center mt-2">
            {invitation
              ? `Welcome ${invitation.full_name}! Set your password below.`
              : (isLogin
                ? 'Please sign in to your account.'
                : 'Create a new account to get started.'
              )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {invitationError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && !invitation && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-gray mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="border-sage/50 focus:border-forest-green"
                    placeholder="Enter your full name"
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
                  className="border-sage/50 focus:border-forest-green disabled:opacity-50"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-gray mb-2">
                  Password *
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (invitation || !isLogin) {
                      validatePassword(e.target.value);
                    }
                  }}
                  required
                  minLength={8}
                  className="border-sage/50 focus:border-forest-green"
                  placeholder="Enter your password"
                />
              </div>

              {(invitation || !isLogin) && (
                <>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-gray mb-2">
                      Confirm Password *
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="border-sage/50 focus:border-forest-green"
                      placeholder="Confirm your password"
                    />
                  </div>

                  {passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-gray">Password Strength:</div>
                        <div className={`text-sm font-medium ${
                          passwordStrength === 'weak' ? 'text-red-600' :
                          passwordStrength === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                        </div>
                      </div>
                      
                      {passwordErrors.length > 0 && (
                        <div className="text-sm text-red-600 space-y-1">
                          {passwordErrors.map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full bg-forest-green hover:bg-forest-green/90"
                  disabled={authManager.state.loading}
                >
                  {authManager.state.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {invitation ? 'Creating Account...' : (isLogin ? 'Signing In...' : 'Creating Account...')}
                    </>
                  ) : (
                    invitation ? 'Complete Setup' : (isLogin ? 'Sign In' : 'Create Account')
                  )}
                </Button>
                
                {!invitation && (
                  <>
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full border-sage/50"
                      onClick={() => setIsLogin(!isLogin)}
                    >
                      {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </Button>
                    
                    {isLogin && (
                      <Button 
                        type="button"
                        variant="ghost"
                        className="w-full text-slate-gray hover:text-forest-green"
                        onClick={() => setShowResetPassword(true)}
                      >
                        Forgot your password?
                      </Button>
                    )}
                  </>
                )}
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </RootedBackground>
  );
};

export default AuthSimplified;