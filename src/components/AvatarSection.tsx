import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AvatarUploadDialog } from './AvatarUploadDialog';
import { Camera } from 'lucide-react';

interface AvatarSectionProps {
  avatarUrl?: string;
  displayName?: string;
  email: string;
  onAvatarUpdated: (url: string) => void;
}

export const AvatarSection = ({ avatarUrl, displayName, email, onAvatarUpdated }: AvatarSectionProps) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-32 w-32">
          <AvatarImage src={avatarUrl} alt="Profile picture" />
          <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="sm"
          className="absolute -bottom-2 -right-2 rounded-full h-10 w-10 p-0"
          onClick={() => setUploadDialogOpen(true)}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      
      <AvatarUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onAvatarUpdated={onAvatarUpdated}
      />
    </div>
  );
};