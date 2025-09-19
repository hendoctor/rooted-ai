import React from 'react';
import { Check, CheckCheck, Loader2 } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  onNavigate?: (notification: Notification) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onNavigate
}) => {
  if (loading) {
    return (
      <div className="w-80 p-4 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-forest-green" />
          <span className="ml-2 text-sm text-muted-foreground">Loading notifications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 p-4 bg-card border border-border rounded-lg shadow-lg">
        <div className="text-center py-8">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border border-border rounded-lg shadow-lg animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-forest-green text-white px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs text-forest-green hover:text-forest-green/80 h-8 px-2"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Check className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h4 className="text-sm font-medium text-foreground mb-1">All caught up!</h4>
          <p className="text-xs text-muted-foreground">
            You have no new notifications
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Refresh notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
};