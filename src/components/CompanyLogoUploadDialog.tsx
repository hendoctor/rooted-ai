import { useState, useCallback, useRef, DragEvent } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCroppedImg, readFile, preloadImage } from '@/utils/avatarUtils';
import { Upload, RotateCcw, Loader2, X } from 'lucide-react';

interface CompanyLogoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoUpdated: (url: string) => void;
  companyId: string;
  companyName: string;
  onOptimisticUpdate?: (blobUrl: string) => void;
}

export const CompanyLogoUploadDialog = ({ 
  open, 
  onOpenChange, 
  onLogoUpdated, 
  companyId,
  companyName,
  onOptimisticUpdate 
}: CompanyLogoUploadDialogProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string>('');
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(async (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
    
    // Generate optimistic preview
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        const blobUrl = URL.createObjectURL(croppedImage);
        setPreviewBlob(blobUrl);
        onOptimisticUpdate?.(blobUrl);
      } catch (error) {
        console.warn('Failed to generate preview:', error);
      }
    }
  }, [imageSrc, onOptimisticUpdate]);

  const processFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file"
      });
      return;
    }

    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      resetCrop();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load image"
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await processFile(imageFile);
    } else {
      toast({
        variant: "destructive",
        title: "No image found",
        description: "Please drop an image file"
      });
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !companyId) return;

    setUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Create unique filename with cache-busting timestamp and random suffix
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newFileName = `${companyId}/${timestamp}_${randomSuffix}.webp`;

      // Get current logo filename for cleanup
      const { data: companyData } = await supabase
        .from('companies')
        .select('logo_filename, logo_url')
        .eq('id', companyId)
        .single();

      // Upload new image in WebP format for better compression
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(newFileName, croppedImage, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(newFileName);

      // Create cache-busting URL
      const cacheBustingParam = `v=${timestamp}&cb=${randomSuffix}`;
      const finalUrl = `${publicUrl}?${cacheBustingParam}`;

      // Preload the image to ensure it's ready
      await preloadImage(finalUrl);

      // Update company record with new logo URL and filename
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          logo_url: finalUrl,
          logo_filename: newFileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // Clean up old file AFTER successful update (non-blocking)
      if (companyData?.logo_filename && companyData.logo_filename !== newFileName) {
        supabase.storage
          .from('company-logos')
          .remove([companyData.logo_filename])
          .then(() => console.log('Successfully cleaned up old logo file:', companyData.logo_filename))
          .catch(error => console.warn('Failed to cleanup old logo file:', error));
      }

      // Clean up preview blob
      if (previewBlob) {
        URL.revokeObjectURL(previewBlob);
        setPreviewBlob('');
      }

      // Update UI immediately
      onLogoUpdated(finalUrl);
      onOpenChange(false);
      resetDialog();
      
      toast({
        title: "Success",
        description: `Logo updated successfully for ${companyName}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save company logo"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!companyId) return;

    setUploading(true);
    try {
      // Get current logo filename for cleanup
      const { data: companyData } = await supabase
        .from('companies')
        .select('logo_filename')
        .eq('id', companyId)
        .single();

      // Update company record first to remove logo URL and filename
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          logo_url: null,
          logo_filename: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // Remove file from storage after successful DB update (non-blocking)
      if (companyData?.logo_filename) {
        supabase.storage
          .from('company-logos')
          .remove([companyData.logo_filename])
          .then(() => console.log('Successfully removed logo file:', companyData.logo_filename))
          .catch(error => console.warn('Failed to cleanup logo file:', error));
      }

      // Update UI immediately
      onLogoUpdated('');
      onOpenChange(false);
      resetDialog();
      
      toast({
        title: "Success",
        description: `Logo removed successfully for ${companyName}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: error.message || "Failed to remove company logo"
      });
    } finally {
      setUploading(false);
    }
  };

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const resetDialog = () => {
    setImageSrc('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsDragging(false);
    if (previewBlob) {
      URL.revokeObjectURL(previewBlob);
      setPreviewBlob('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Company Logo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!imageSrc && (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {isDragging ? 'Drop your logo here' : 'Drag & drop a logo or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports JPEG, PNG, WebP • Max 5MB
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="sr-only"
              />
              <Button variant="outline" size="sm" type="button">
                Choose File
              </Button>
            </div>
          )}

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  </div>
                )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetDialog}
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
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
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCrop}
                  type="button"
                  disabled={uploading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => {
                resetDialog();
                onOpenChange(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            {imageSrc && (
              <Button 
                onClick={handleUpload} 
                disabled={uploading || !croppedAreaPixels}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Logo'
                )}
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
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Current Logo'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};