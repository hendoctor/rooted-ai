import React from 'react';
import { useAuth } from '@/hooks/useAuthReliable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Building, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileMenuProps {
  onSignOut: () => void;
}

const ProfileMenu = ({ onSignOut }: ProfileMenuProps) => {
  const { user, userRole, signOut, companies } = useAuth();

  if (!user) return null;

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
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
          {companies && companies.length > 0 && (
            <p className="text-xs leading-none text-muted-foreground">
              {companies.map(c => c.name).join(', ')}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        {userRole === 'Client' && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/client-portal" className="cursor-pointer">
                <Building className="mr-2 h-4 w-4" />
                <span>Client Portal</span>
              </Link>
            </DropdownMenuItem>
            {companies && companies.length > 0 && (
              <DropdownMenuItem asChild>
                <Link to={`/${companies[0].slug}`} className="cursor-pointer">
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
            {/* Admins see Rooted AI company portal and their profile */}
            <DropdownMenuItem asChild>
              <Link to="/rooted-ai" className="cursor-pointer">
                <Building className="mr-2 h-4 w-4" />
                <span>Rooted AI Portal</span>
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
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;