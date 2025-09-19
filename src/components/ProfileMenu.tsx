import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Building, LogOut, Settings, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileMenuProps {
  onSignOut: () => void;
}

const ProfileMenu = ({ onSignOut }: ProfileMenuProps) => {
  const { user, userRole, companies } = useAuth();
  const [avatarUrl, setAvatarUrl] = React.useState<string>('');

  React.useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('auth_user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatar();

    // Set up real-time subscription for avatar updates
    const channel = supabase
      .channel(`user-avatar-changes-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `auth_user_id=eq.${user?.id}`
        },
        (payload) => {
          const newAvatarUrl = payload.new.avatar_url || '';
          setAvatarUrl(newAvatarUrl);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };


  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={avatarUrl} 
              alt="Profile"
              key={avatarUrl}
            />
            <AvatarFallback className="bg-forest-green text-white">
              {getInitials(user.email || '')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">{user.email}</p>
          {userRole && (
            <p className="text-xs leading-none text-muted-foreground">
              {userRole}
            </p>
          )}
          {userRole !== 'Admin' && companies && companies.length > 0 && (
            <p className="text-xs leading-none text-muted-foreground">
              {companies.map(c => c.name).join(', ')}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        {userRole === 'Client' && (
            <>
               {companies && companies.length > 0 && (
                <DropdownMenuItem asChild>
                  <Link to={`/${companies[0].slug}`} className="cursor-pointer">
                    <Building className="mr-2 h-4 w-4" />
                    <span>Client Portal</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {companies && companies.length > 0 && (
                <DropdownMenuItem asChild>
                  <Link to={`/${companies[0].slug}/settings`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Company Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
        {userRole === 'Admin' && (
          <>
            {/* Admins see RootedAI admin link and their profile */}
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <Building className="mr-2 h-4 w-4" />
                <span>RootedAI Admin</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <a href="mailto:support@rootedai.com" className="cursor-pointer">
            <Mail className="mr-2 h-4 w-4" />
            <span>Support</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;