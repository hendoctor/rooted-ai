import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { LoadingIcon } from '@/components/LoadingSpinner';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

const PWAUpdateNotification = () => {
  const { 
    hasUpdate, 
    isUpdating, 
    updateAvailable, 
    applyUpdate, 
    dismissUpdate,
    checkForUpdates 
  } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-primary bg-background/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              App Update Available
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissUpdate}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            A new version is ready to install with the latest features and improvements.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={applyUpdate}
              disabled={isUpdating}
              size="sm"
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <LoadingIcon size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-2" />
                  Update Now
                </>
              )}
            </Button>
            <Button
              onClick={dismissUpdate}
              variant="outline"
              size="sm"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAUpdateNotification;