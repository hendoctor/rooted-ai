import React, { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    markAllAsUnread,
    error
  } = useNotifications();
  const { toast } = useToast();

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if unread
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Navigate to content if URL exists
      if (notification.content_url) {
        window.open(notification.content_url, '_blank');
      }

      // Close dropdown
      setIsOpen(false);

      // Show toast confirmation
      toast({
        title: "Notification opened",
        description: notification.content_title || notification.title,
      });
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast({
        title: "Error",
        description: "Failed to process notification",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadBefore = unreadCount;
      await markAllAsRead();
      toast({
        title: "All notifications marked as read",
        description: `${unreadBefore} notifications updated`,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsUnread = async () => {
    try {
      const readCount = notifications.filter(notification => notification.is_read).length;
      if (readCount === 0) {
        return;
      }

      await markAllAsUnread();
      toast({
        title: "Notifications moved to unread",
        description: `${readCount} notifications updated`,
      });
    } catch (error) {
      console.error('Error marking all as unread:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as unread",
        variant: "destructive",
      });
    }
  };

  const handleToggleReadState = async (notification: Notification) => {
    try {
      if (notification.is_read) {
        await markAsUnread(notification.id);
        toast({
          title: "Marked as unread",
          description: notification.title,
        });
      } else {
        await markAsRead(notification.id);
        toast({
          title: "Marked as read",
          description: notification.title,
        });
      }
    } catch (error) {
      console.error('Error updating notification state:', error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Notification Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div>
          <NotificationBell
            unreadCount={unreadCount}
            onClick={() => setIsOpen(!isOpen)}
            isOpen={isOpen}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0 border-0 shadow-lg"
        sideOffset={8}
      >
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkAllAsRead={handleMarkAllAsRead}
          onMarkAllAsUnread={handleMarkAllAsUnread}
          onNotificationClick={handleNotificationClick}
          onToggleReadState={handleToggleReadState}
          onClose={handleClose}
        />
      </PopoverContent>
    </Popover>
  );
};