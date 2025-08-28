import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuthReliable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Building, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';

const Profile = () => {
  const { user, userRole, companies } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
  });
  const [profile, setProfile] = useState<{ display_name?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: profileRows = [], showCachedHint } = useTable<{ display_name?: string; email?: string }>({
    table: 'users',
    role: userRole || 'anon',
    userId: user?.id,
    companyIds: companies?.map(c => c.id) || [],
    filters: user?.email ? { email: user.email } : {},
    select: 'display_name, email',
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (profileRows[0]) {
      setProfile(profileRows[0]);
      setFormData({
        display_name: profileRows[0].display_name || '',
        email: profileRows[0].email || user?.email || '',
      });
    }
  }, [profileRows, user]);

  useEffect(() => {
    if (profile && user) {
      const hasNameChange = formData.display_name !== (profile.display_name || '');
      const hasEmailChange = formData.email !== (user.email || '');
      setHasChanges(hasNameChange || hasEmailChange);
    }
  }, [formData, profile, user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Update user display_name in users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (userError) throw userError;

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
                {showCachedHint && (
                  <p className="text-xs text-muted-foreground">Showing cached data (network issue)</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Enter your display name"
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

                {companies && companies.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Companies
                    </Label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                      {companies.map(c => c.name).join(', ')}
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

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;