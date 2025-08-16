import React from 'react';
import { useAuth } from '@/hooks/useAuthSecure';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Building, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileMenuProps {
  onSignOut: () => void;
}

const ProfileMenu = ({ onSignOut }: ProfileMenuProps) => {
  const { user, userRole, clientName } = useAuth();

  if (!user) return null;

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getCompanySlug = (clientName: string) => {
    return clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
          {clientName && (
            <p className="text-xs leading-none text-muted-foreground">
              {clientName}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        {clientName && (
          <DropdownMenuItem asChild>
            <Link to={`/${getCompanySlug(clientName)}`} className="cursor-pointer">
              <Building className="mr-2 h-4 w-4" />
              <span>Company Portal</span>
            </Link>
          </DropdownMenuItem>
        )}
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