import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';
import { validatePasswordStrength } from '@/utils/securityConfig';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
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

    // Set up minimal auth state listener - don't redirect immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only redirect after successful login and a short delay to allow main auth system to catch up
        if (event === 'SIGNED_IN' && session?.user && type !== 'recovery') {
          setTimeout(() => {
            navigate('/');
          }, 2000); // 2 second delay to let main auth system establish session
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Don't redirect on initial load - let user interact first
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const loadInvitation = async (token: string) => {
    setLoadingInvitation(true);
    setInvitationError(null);
    
    try {
      console.log(`Loading invitation for token: ${token.substring(0, 8)}...`);
      
      // Use secure validation function
      const { data, error } = await supabase.rpc('validate_invitation_secure', {
        token_input: token
      });

      console.log('Invitation validation result:', { data, error });

      if (error) {
        console.error('Database error validating invitation:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Type-safe handling of the JSON response
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

      // Success - invitation found and valid
      const invitation = validationResult.invitation;
      setInvitation(invitation);
      setEmail(invitation.email);
      setFullName(invitation.full_name);
      setIsLogin(false); // Switch to signup mode
      
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
    
    // Set password strength indicator
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

  const validatePasswordMatch = () => {
    return password === confirmPassword;
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
      
      if (!validatePasswordMatch()) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please check both password fields.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (!invitation) {
        // Login flow
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
        // Invitation signup flow
        console.log('Starting invitation signup for:', invitation.email);
        
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email: invitation.email, // Use invitation email explicitly
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: invitation.full_name, // Use invitation name
              invited_role: invitation.role,
              invitation_id: invitation.id
            }
          }
        });

        console.log('Signup result:', { data, error });

        if (error) {
          console.error('Signup error:', error);
          toast({
            title: "Account Creation Failed",
            description: error.message,
            variant: "destructive",
          });
        } else if (data.user) {
          console.log('User created successfully:', data.user.id);
          
          try {
            // Mark invitation as accepted with real-time update
            const { error: updateError } = await supabase
              .from('user_invitations')
              .update({ 
                status: 'accepted',
                accepted_at: new Date().toISOString()
              })
              .eq('id', invitation.id);

            if (updateError) {
              console.error('Failed to update invitation:', updateError);
              throw new Error('Failed to update invitation status');
            }

            // Create/update user record with role and client_name
            const userRecord = {
              auth_user_id: data.user.id,
              email: invitation.email,
              role: invitation.role,
              client_name: invitation.client_name || null
            };

            console.log('Creating user record:', userRecord);

            const { error: userError } = await supabase
              .from('users')
              .upsert(userRecord, { 
                onConflict: 'auth_user_id',
                ignoreDuplicates: false
              });

            if (userError) {
              console.error('Failed to create user record:', userError);
              throw new Error(`Database error: ${userError.message}`);
            }

            console.log('User record created successfully');

            // Log successful account creation
            await supabase.rpc('log_security_event', {
              event_type: 'invitation_account_created',
              event_details: { 
                user_id: data.user.id,
                email: invitation.email,
                role: invitation.role,
                invitation_id: invitation.id
              }
            });

            toast({
              title: "Welcome to the team!",
              description: `Your account has been created successfully with ${invitation.role} access. You can now sign in.`,
            });

            // Reset form and redirect to login
            setPassword('');
            setConfirmPassword('');
            setInvitation(null);
            setIsLogin(true);
            
            // Remove invite parameter from URL
            navigate('/auth', { replace: true });
            
          } catch (processError) {
            console.error('Failed to process invitation after signup:', processError);
            toast({
              title: "Account Created",
              description: "Your account was created but there was an issue setting up your role. Please contact support.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error: unknown) {
      console.error('Unexpected error during submit:', error);
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
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Use centralized password validation
    if (!validatePasswordStrength(newPassword).isValid) {
      const errors = validatePasswordStrength(newPassword).errors;
      toast({
        title: "Password Too Weak",
        description: errors.join(', '),
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/Assets/22badab3-8f25-475f-92d7-167cbc732868.png"
            alt="RootedAI logo"
            className="mx-auto h-24 w-auto"
          />
          <h2 className="text-3xl font-bold text-forest-green">
            {invitation ? 'Complete Your Invitation' : 'Access Your RootedAI Dashboard'}
          </h2>
          {!invitation && (
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-800">
                <strong>Active Clients Only</strong>
              </p>
            </div>
          )}
          {loadingInvitation && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                Loading invitation details...
              </p>
            </div>
          )}
          {invitationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {invitationError}
              </p>
            </div>
          )}
        </div>

        <Card className="border-sage/30 shadow-lg">
          {!isLogin && (
            <CardHeader>
              <CardTitle className="text-xl text-forest-green text-center">
                {invitation ? 'Complete Your Invitation' : 'Sign Up'}
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
          )}
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {invitation && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-gray mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!!invitation}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (invitation) validatePassword(e.target.value);
                  }}
                  required
                  className="border-sage/50 focus:border-forest-green"
                  placeholder={invitation ? "Create a secure password" : "Enter your password"}
                  minLength={8}
                />
                {invitation && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-sage/30 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                            passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                            'w-full bg-green-500'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength === 'weak' ? 'text-red-600' :
                        passwordStrength === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
                {invitation && passwordErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600">{error}</p>
                    ))}
                  </div>
                )}
              </div>

              {invitation && (
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
                    className={`border-sage/50 focus:border-forest-green ${
                      confirmPassword && !validatePasswordMatch() ? 'border-red-500' : ''
                    }`}
                    placeholder="Confirm your password"
                    minLength={8}
                  />
                  {confirmPassword && !validatePasswordMatch() && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                  {confirmPassword && validatePasswordMatch() && password && (
                    <p className="mt-1 text-sm text-green-600">Passwords match ✓</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-3 text-lg rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                {loading ? 'Please wait...' : (invitation ? 'Create Account' : 'Sign In')}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
