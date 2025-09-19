import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ViewManagementDialog } from './ViewManagementDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Settings, Eye, Trash2, Loader2 } from 'lucide-react';

export interface TableViewConfig {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  sortKey?: string;
  sortAsc?: boolean;
}

interface SavedView {
  id: string;
  view_name: string;
  column_config: TableViewConfig;
  is_default: boolean;
}

interface TableViewManagerProps {
  contentType: string;
  currentConfig: TableViewConfig;
  onConfigChange: (config: TableViewConfig) => void;
  onSaveView?: () => void;
}

export function TableViewManager({ contentType, currentConfig, onConfigChange, onSaveView }: TableViewManagerProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadSavedViews();
  }, [contentType, user?.id]);

  const loadSavedViews = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('admin_table_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .order('view_name');

      if (error) throw error;

      const typedData = (data || []).map(view => ({
        ...view,
        column_config: view.column_config as unknown as TableViewConfig
      }));

      setSavedViews(typedData);
      
      // Load default view if exists
      const defaultView = typedData.find(view => view.is_default);
      if (defaultView && !currentViewId) {
        setCurrentViewId(defaultView.id);
        onConfigChange(defaultView.column_config);
      }
    } catch (error) {
      console.error('Error loading saved views:', error);
    }
  };

  const saveCurrentView = async (viewName: string, isDefault = false) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // If setting as default, clear existing defaults
      if (isDefault) {
        await supabase
          .from('admin_table_views')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('content_type', contentType);
      }

      const { data, error } = await supabase
        .from('admin_table_views')
        .insert({
          user_id: user.id,
          view_name: viewName,
          content_type: contentType,
          column_config: currentConfig as any,
          is_default: isDefault
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`View "${viewName}" saved successfully`);
      setCurrentViewId(data.id);
      loadSavedViews();
      onSaveView?.();
    } catch (error) {
      console.error('Error saving view:', error);
      toast.error('Failed to save view');
    } finally {
      setLoading(false);
    }
  };

  const updateView = async (viewId: string, viewName: string, isDefault = false) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // If setting as default, clear existing defaults
      if (isDefault) {
        await supabase
          .from('admin_table_views')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('content_type', contentType);
      }

      const { error } = await supabase
        .from('admin_table_views')
        .update({
          view_name: viewName,
          column_config: currentConfig as any,
          is_default: isDefault,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewId);

      if (error) throw error;

      toast.success(`View "${viewName}" updated successfully`);
      loadSavedViews();
      onSaveView?.();
    } catch (error) {
      console.error('Error updating view:', error);
      toast.error('Failed to update view');
    } finally {
      setLoading(false);
    }
  };

  const deleteView = async (viewId: string) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_table_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      toast.success('View deleted successfully');
      if (currentViewId === viewId) {
        setCurrentViewId(null);
      }
      loadSavedViews();
    } catch (error) {
      console.error('Error deleting view:', error);
      toast.error('Failed to delete view');
    } finally {
      setLoading(false);
    }
  };

  const loadView = useCallback(async (viewId: string) => {
    if (isLoadingView || currentViewId === viewId) return;
    
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setIsLoadingView(true);
      
      // Optimistic update
      setCurrentViewId(viewId);
      
      try {
        // Small delay to prevent flickering on fast networks
        await new Promise(resolve => setTimeout(resolve, 50));
        
        onConfigChange(view.column_config);
        toast.success(`Loaded view "${view.view_name}"`);
      } catch (error) {
        console.error('Error loading view:', error);
        toast.error('Failed to load view');
      } finally {
        setIsLoadingView(false);
      }
    }
  }, [savedViews, onConfigChange, isLoadingView, currentViewId]);

  const selectOptions = useMemo(() => 
    savedViews.map(view => ({
      id: view.id,
      name: view.view_name,
      isDefault: view.is_default
    })), [savedViews]
  );

  const currentView = useMemo(() => 
    savedViews.find(v => v.id === currentViewId), 
    [savedViews, currentViewId]
  );

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Select value={currentViewId || ''} onValueChange={loadView} disabled={isLoadingView}>
          <SelectTrigger className="w-48 transition-opacity duration-200">
            <SelectValue placeholder="Select saved view..." />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map(view => (
              <SelectItem key={view.id} value={view.id}>
                <div className="flex items-center gap-2">
                  {view.name}
                  {view.isDefault && <Eye className="h-3 w-3 text-primary" />}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoadingView && (
          <Loader2 className="h-4 w-4 animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading || isLoadingView}>
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowManagementDialog(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Current View
          </DropdownMenuItem>
          {currentViewId && (
            <DropdownMenuItem 
              onClick={() => deleteView(currentViewId)}
              className="text-destructive"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Current View
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewManagementDialog
        open={showManagementDialog}
        onOpenChange={setShowManagementDialog}
        onSave={saveCurrentView}
        onUpdate={currentViewId ? (name, isDefault) => updateView(currentViewId, name, isDefault) : undefined}
        currentView={currentView}
      />
    </div>
  );
}