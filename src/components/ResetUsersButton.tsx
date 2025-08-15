import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Crown } from 'lucide-react';

export const ResetUsersButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleResetUsers = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Calling reset-users function...');
      
      const { data, error } = await supabase.functions.invoke('reset-users', {
        body: {}
      });

      if (error) {
        console.error('❌ Function call error:', error);
        toast({
          title: "Error",
          description: `Failed to reset users: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Function response:', data);
      
      toast({
        title: "Users Reset Successfully",
        description: `Admin account created for james@hennahane.com. Temporary password: ${data.temporary_password}`,
      });

      // Sign out current user since all users were deleted
      await supabase.auth.signOut();
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while resetting users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Reset All Users
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Reset All Users & Create Admin
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This will:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Delete ALL existing users</strong> from authentication</li>
              <li>Create a new Admin account for <strong>james@hennahane.com</strong></li>
              <li>Set display name to <strong>"James Hennahane"</strong></li>
              <li>Assign <strong>Admin role</strong> to the new account</li>
            </ul>
            <p className="text-destructive font-medium">
              ⚠️ This action cannot be undone! All current users will be permanently deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleResetUsers}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? 'Resetting...' : 'Reset Users & Create Admin'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};