import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Download, RefreshCw } from 'lucide-react';

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasUpdate: boolean;
  currentVersion: string;
  isUpdating: boolean;
  onApplyUpdate: () => void;
}

const UpdateStatusDialog: React.FC<UpdateStatusDialogProps> = ({
  open,
  onOpenChange,
  hasUpdate,
  currentVersion,
  isUpdating,
  onApplyUpdate
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasUpdate ? (
              <>
                <Download className="h-5 w-5 text-forest-green" />
                Update Available
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-forest-green" />
                App is Up to Date
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasUpdate 
              ? "A new version of RootedAI is available and ready to install."
              : "You're running the latest version of RootedAI."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
            <span className="text-sm font-medium">Current Version:</span>
            <Badge variant="outline" className="text-forest-green border-forest-green">
              v{currentVersion}
            </Badge>
          </div>
          
          {hasUpdate && (
            <div className="flex items-center justify-between p-3 bg-forest-green/10 rounded-lg">
              <span className="text-sm font-medium">Update Status:</span>
              <Badge className="bg-forest-green text-white">
                Ready to Install
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Close
          </Button>
          {hasUpdate && (
            <Button
              onClick={onApplyUpdate}
              disabled={isUpdating}
              className="flex-1 bg-forest-green hover:bg-forest-green/90 text-white"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateStatusDialog;