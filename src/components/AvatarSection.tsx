import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AvatarUploadDialog } from './AvatarUploadDialog';
import { Camera, Loader2 } from 'lucide-react';

interface AvatarSectionProps {
  avatarUrl?: string;
  displayName?: string;
  email: string;
  onAvatarUpdated: (url: string) => void;
}

export const AvatarSection = ({ avatarUrl, displayName, email, onAvatarUpdated }: AvatarSectionProps) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [optimisticUrl, setOptimisticUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
    // Clear optimistic preview when real URL is available
    if (avatarUrl && optimisticUrl) {
      URL.revokeObjectURL(optimisticUrl);
      setOptimisticUrl('');
    }
  }, [avatarUrl, optimisticUrl]);

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const handleAvatarUpdate = (newUrl: string) => {
    setCurrentAvatarUrl(newUrl);
    setOptimisticUrl(''); // Clear optimistic preview
    setIsLoading(false);
    onAvatarUpdated(newUrl);
  };

  const handleOptimisticUpdate = (blobUrl: string) => {
    setOptimisticUrl(blobUrl);
    setIsLoading(true);
  };

  const displayUrl = optimisticUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-32 w-32">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <AvatarImage 
            src={displayUrl} 
            alt="Profile picture"
            key={displayUrl}
            className="transition-opacity duration-200"
            onLoad={() => {
              if (currentAvatarUrl) {
                setIsLoading(false);
              }
            }}
          />
          <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="sm"
          className="absolute -bottom-2 -right-2 rounded-full h-10 w-10 p-0 shadow-lg"
          onClick={() => setUploadDialogOpen(true)}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      
      <AvatarUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onAvatarUpdated={handleAvatarUpdate}
        onOptimisticUpdate={handleOptimisticUpdate}
      />
    </div>
  );
};