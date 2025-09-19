import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface SavedView {
  id: string;
  view_name: string;
  is_default: boolean;
}

interface ViewManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (viewName: string, isDefault: boolean) => void;
  onUpdate?: (viewName: string, isDefault: boolean) => void;
  currentView?: SavedView;
}

export function ViewManagementDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  onUpdate, 
  currentView 
}: ViewManagementDialogProps) {
  const [viewName, setViewName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (currentView) {
        setViewName(currentView.view_name);
        setIsDefault(currentView.is_default);
      } else {
        setViewName('');
        setIsDefault(false);
      }
    }
  }, [open, currentView]);

  const handleSave = async () => {
    if (!viewName.trim()) return;

    setLoading(true);
    try {
      if (currentView && onUpdate) {
        await onUpdate(viewName.trim(), isDefault);
      } else {
        await onSave(viewName.trim(), isDefault);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving view:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && viewName.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentView ? 'Update Table View' : 'Save Table View'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter view name..."
              autoFocus
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="is-default" className="text-sm">
              Set as default view for this content type
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!viewName.trim() || loading}
          >
            {loading ? 'Saving...' : currentView ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}