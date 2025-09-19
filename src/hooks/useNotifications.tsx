import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'announcement' | 'resource' | 'ai_tool' | 'useful_link' | 'faq' | 'coaching' | 'kpi';
  reference_id: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  read_at?: string;
  content_title?: string;
  content_url?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notifications using the database function
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: user.id,
        p_limit: 50
      });

      if (error) throw error;

      setNotifications((data || []) as Notification[]);

      // Fetch unread count
      const { data: countData, error: countError } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: user.id
      });

      if (countError) throw countError;

      setUnreadCount(countData || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationIds: string[] | null = null) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_notifications_as_read', {
        p_notification_ids: notificationIds,
        p_user_id: user.id
      });

      if (error) throw error;

      // Update local state optimistically
      if (notificationIds === null) {
        // Mark all as read
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        setUnreadCount(0);
      } else {
        // Mark specific notifications as read
        setNotifications(prev => prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        ));
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }

      toast({
        title: "Notifications updated",
        description: notificationIds === null ? "All notifications marked as read" : "Notifications marked as read",
      });
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const markSingleAsRead = useCallback((notificationId: string) => {
    markAsRead([notificationId]);
  }, [markAsRead]);

  const markAllAsRead = useCallback(() => {
    markAsRead(null);
  }, [markAsRead]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          // Add new notification to the list
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for high priority notifications
          if (newNotification.priority === 'high') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification updated:', payload);
          
          // Update notification in the list
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => prev.map(n => 
            n.id === updatedNotification.id ? updatedNotification : n
          ));

          // Update unread count if read status changed
          const oldNotification = payload.old as Notification;
          if (!oldNotification.is_read && updatedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (oldNotification.is_read && !updatedNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Fetch notifications on component mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead: markSingleAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};