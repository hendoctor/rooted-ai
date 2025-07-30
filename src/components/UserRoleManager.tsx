import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { userRoleUpdateSchema, sanitizeHtml, rateLimitCheck } from '@/utils/inputValidation';
import { z } from 'zod';

interface UserRoleManagerProps {
  onUserUpdated?: () => void;
}

const UserRoleManager = ({ onUserUpdated }: UserRoleManagerProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmData, setConfirmData] = useState<{ email: string; role: string } | null>(null);
  const { toast } = useToast();

  const handleEmailChange = (value: string) => {
    setEmail(sanitizeHtml(value.toLowerCase().trim()));
  };

  const handleSubmit = async () => {
    // Rate limiting check
    if (!rateLimitCheck('user_role_update', 10, 300000)) { // 10 requests per 5 minutes
      toast({
        title: "Rate Limited",
        description: "Too many role updates. Please wait before trying again.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate input data
      const validatedData = userRoleUpdateSchema.parse({ email, role });

      // Check if user exists first
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', validatedData.email)
        .maybeSingle();

      if (checkError) {
        throw new Error('Failed to check user existence');
      }

      if (!existingUser) {
        toast({
          title: "User Not Found",
          description: `No profile found for ${validatedData.email}`,
          variant: "destructive"
        });
      } else {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: validatedData.role })
          .eq('email', validatedData.email);

        // Keep profile table in sync if needed
        await supabase
          .from('profiles')
          .update({ role: validatedData.role })
          .eq('email', validatedData.email);

        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }

        toast({
          title: "Role Updated",
          description: `${validatedData.email}'s role updated to ${validatedData.role}`,
        });
      }

      // Reset form
      setEmail('');
      setRole('');
      setConfirmData(null);
      
      // Notify parent component
      onUserUpdated?.();

    } catch (error) {
      console.error('User role update error:', error);
      
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "Failed to update user role",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = userRoleUpdateSchema.parse({ email, role });
      setConfirmData({ email: validatedData.email, role: validatedData.role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-sage/20 p-6">
      <h3 className="text-xl font-bold text-forest-green mb-4">Manage User Roles</h3>
      
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-2">
            User Email
          </label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="user@example.com"
            required
            maxLength={254}
          />
        </div>
        
        <div>
          <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <Select value={role} onValueChange={setRole} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <AlertDialog open={!!confirmData} onOpenChange={() => setConfirmData(null)}>
          <AlertDialogTrigger asChild>
            <Button 
              type="submit"
              disabled={!email || !role}
              className="bg-forest-green hover:bg-forest-green/90"
            >
              Update User Role
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to set the role of{' '}
                <span className="font-semibold">{confirmData?.email}</span> to{' '}
                <span className="font-semibold">{confirmData?.role}</span>?
                {confirmData?.role === 'Admin' && (
                  <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded text-amber-800">
                    <strong>Warning:</strong> Admin users have full access to all system functions.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-forest-green hover:bg-forest-green/90"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Update'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </div>
  );
};

export default UserRoleManager;