import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCroppedImg, readFile } from '@/utils/avatarUtils';
import { Upload, RotateCcw } from 'lucide-react';

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUpdated: (url: string) => void;
}

export const AvatarUploadDialog = ({ open, onOpenChange, onAvatarUpdated }: AvatarUploadDialogProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB"
      });
      return;
    }

    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load image"
      });
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    setUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Create unique filename with cache-busting timestamp and random suffix
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newFileName = `${user.id}/${timestamp}_${randomSuffix}.jpg`;

      // Get current avatar filename for cleanup
      const { data: userData } = await supabase
        .from('users')
        .select('avatar_filename, avatar_url')
        .eq('auth_user_id', user.id)
        .single();

      // Upload new image first with proper cache control
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(newFileName, croppedImage, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(newFileName, {
          transform: {
            width: 300,
            height: 300,
            quality: 85
          }
        });

      // Add cache-busting parameter to ensure immediate refresh
      const cachebustedUrl = `${publicUrl}?v=${timestamp}`;

      // Update user record with new avatar URL and filename
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: cachebustedUrl,
          avatar_filename: newFileName,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id);

      if (updateError) throw updateError;

      // Clean up old file AFTER successful update
      if (userData?.avatar_filename && userData.avatar_filename !== newFileName) {
        try {
          await supabase.storage
            .from('avatars')
            .remove([userData.avatar_filename]);
          console.log('Successfully cleaned up old avatar file:', userData.avatar_filename);
        } catch (cleanupError) {
          console.warn('Failed to cleanup old avatar file:', cleanupError);
        }
      }

      // Update UI immediately with cache-busted URL
      onAvatarUpdated(cachebustedUrl);
      onOpenChange(false);
      setImageSrc('');
      
      toast({
        title: "Success",
        description: "Profile picture saved successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save profile picture"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Get current avatar filename for cleanup
      const { data: userData } = await supabase
        .from('users')
        .select('avatar_filename')
        .eq('auth_user_id', user.id)
        .single();

      // Update user record first to remove avatar URL and filename
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: null,
          avatar_filename: null,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id);

      if (updateError) throw updateError;

      // Remove file from storage after successful DB update
      if (userData?.avatar_filename) {
        try {
          await supabase.storage
            .from('avatars')
            .remove([userData.avatar_filename]);
          console.log('Successfully removed avatar file:', userData.avatar_filename);
        } catch (cleanupError) {
          console.warn('Failed to cleanup avatar file:', cleanupError);
        }
      }

      // Update UI immediately
      onAvatarUpdated('');
      onOpenChange(false);
      setImageSrc('');
      
      toast({
        title: "Success",
        description: "Profile picture removed successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: error.message || "Failed to remove profile picture"
      });
    } finally {
      setUploading(false);
    }
  };

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!imageSrc && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select an image to crop for your profile picture
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
            </div>
          )}

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Zoom:</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCrop}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {imageSrc && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
          {!imageSrc && (
            <Button 
              variant="destructive" 
              onClick={handleRemove} 
              disabled={uploading}
              className="w-full"
            >
              {uploading ? 'Removing...' : 'Remove Current Photo'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};