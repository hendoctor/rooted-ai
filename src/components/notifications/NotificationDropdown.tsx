import React from 'react';
import { BellDot, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './NotificationItem';
import { Notification } from '@/hooks/useNotifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAllAsRead: () => void;
  onMarkAllAsUnread: () => void;
  onNotificationClick: (notification: Notification) => void;
  onToggleReadState: (notification: Notification) => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkAllAsRead,
  onMarkAllAsUnread,
  onNotificationClick,
  onToggleReadState,
  onClose,
}) => {
  const hasNotifications = notifications.length > 0;
  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some(notification => notification.is_read);

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-80 shadow-lg border-0 animate-fade-in">
        {/* Header */}
        <div className="p-3 border-b border-border/60 bg-muted/40">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
              {hasUnread ? (
                <span className="text-xs bg-forest-green/10 text-forest-green px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">All caught up</span>
              )}
            </div>
            {hasNotifications && (
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMarkAllAsRead}
                        disabled={loading}
                        className="h-8 w-8 text-forest-green hover:text-forest-green/80"
                        aria-label="Mark all as read"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCheck className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Mark all as read</TooltipContent>
                  </Tooltip>
                )}
                {hasRead && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMarkAllAsUnread}
                        disabled={loading}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Mark all as unread"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BellDot className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Mark all as unread</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-80">
          {loading && !hasNotifications ? (
            <div className="p-8 flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm font-medium">Loading notifications...</p>
            </div>
          ) : !hasNotifications ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <CheckCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium mb-1">All caught up!</p>
              <p className="text-xs">No notifications yet. We'll keep you posted.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={onNotificationClick}
                  onToggleRead={onToggleReadState}
                  disabled={loading}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {hasNotifications && (
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
    </TooltipProvider>
  );
};