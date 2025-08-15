import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNewsletterSubscription } from '@/hooks/useNewsletterSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Building, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';

const Profile = () => {
  const { user, profile, userRole, clientName } = useAuth();
  const { subscription, subscribe, unsubscribe, isSubscribed, loading: newsletterLoading } = useNewsletterSubscription();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        full_name: profile.full_name || '',
        email: user.email || '',
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile && user) {
      const hasNameChange = formData.full_name !== (profile.full_name || '');
      const hasEmailChange = formData.email !== (user.email || '');
      setHasChanges(hasNameChange || hasEmailChange);
    }
  }, [formData, profile, user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (emailError) throw emailError;
      }

      toast({
        title: 'Profile updated successfully',
        description: 'Your changes have been saved.',
      });

      setHasChanges(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error updating profile',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewsletterToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (error) {
      console.error('Error toggling newsletter:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-warm-beige dark:bg-slate-900">
        <Header />
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-slate-gray dark:text-white">Please sign in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-beige dark:bg-slate-900">
      <Header />
      <div className="pt-20 px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link 
            to="/" 
            className="inline-flex items-center text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-sage mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                    {userRole || 'Client'}
                  </div>
                </div>

                {clientName && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Company
                    </Label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                      {clientName}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="w-full bg-forest-green hover:bg-forest-green/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Newsletter Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="text-forest-green flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Newsletter Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email Updates</p>
                    <p className="text-xs text-slate-gray dark:text-slate-400">
                      Receive the latest news and updates from our platform
                    </p>
                  </div>
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handleNewsletterToggle}
                    disabled={newsletterLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;