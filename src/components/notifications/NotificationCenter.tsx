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
      await markAllAsRead();
      toast({
        title: "All notifications marked as read",
        description: `${unreadCount} notifications updated`,
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
          onNotificationClick={handleNotificationClick}
          onClose={handleClose}
        />
      </PopoverContent>
    </Popover>
  );
};