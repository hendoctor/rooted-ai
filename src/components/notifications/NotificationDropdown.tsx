import React from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './NotificationItem';
import { Notification } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkAllAsRead,
  onNotificationClick,
  onClose,
}) => {
  return (
    <Card className="w-80 shadow-lg border-0 animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-forest-green/10 text-forest-green px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              disabled={loading}
              className="text-forest-green hover:text-forest-green/80 h-auto p-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span className="ml-1 text-xs">Mark all read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-80">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <CheckCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium mb-1">All caught up!</p>
            <p className="text-xs">No new notifications to show.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={onNotificationClick}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};