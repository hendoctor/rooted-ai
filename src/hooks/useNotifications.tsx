import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CacheManager } from '@/lib/cacheManager';

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

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  markAllAsUnread: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CACHE_KEY = 'user_notifications';
const COUNT_CACHE_KEY = 'unread_count';

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedNotifications = CacheManager.get<Notification[]>(CACHE_KEY);
      const cachedCount = CacheManager.get<number>(COUNT_CACHE_KEY);

      if (cachedNotifications && cachedCount !== null) {
        setNotifications(cachedNotifications);
        setUnreadCount(cachedCount);
        setLoading(false);
      }

      // Fetch notifications directly from table since functions may not exist yet
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationError) throw notificationError;

      const count = notificationData?.filter(n => !n.is_read).length || 0;

      const formattedNotifications: Notification[] = (notificationData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        notification_type: item.notification_type,
        reference_id: item.reference_id,
        is_read: item.is_read,
        priority: item.priority,
        created_at: item.created_at,
        read_at: item.read_at,
        content_title: item.title, // Fallback to notification title
        content_url: null, // Will be enhanced later
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(count);

      // Cache the results
      CacheManager.set(CACHE_KEY, formattedNotifications, 5 * 60 * 1000); // 5 minutes
      CacheManager.set(COUNT_CACHE_KEY, count, 5 * 60 * 1000);

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true, read_at: new Date().toISOString() }
          : notification
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Clear cache to force refresh
      CacheManager.invalidate(CACHE_KEY);
      CacheManager.invalidate(COUNT_CACHE_KEY);

    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(notification => ({
        ...notification,
        is_read: true,
        read_at: new Date().toISOString()
      })));
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Clear cache
      CacheManager.invalidate(CACHE_KEY);
      CacheManager.invalidate(COUNT_CACHE_KEY);

    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      let updatedUnreadCount = 0;

      setNotifications(prev => {
        const updated = prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: false, read_at: undefined }
            : notification
        );

        updatedUnreadCount = updated.filter(notification => !notification.is_read).length;
        return updated;
      });

      setUnreadCount(updatedUnreadCount);

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: false,
          read_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      CacheManager.invalidate(CACHE_KEY);
      CacheManager.invalidate(COUNT_CACHE_KEY);
    } catch (err) {
      console.error('Error marking notification as unread:', err);
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const markAllAsUnread = useCallback(async () => {
    if (!user?.id) return;

    try {
      let totalNotifications = 0;

      setNotifications(prev => {
        totalNotifications = prev.length;
        return prev.map(notification => ({
          ...notification,
          is_read: false,
          read_at: undefined
        }));
      });

      setUnreadCount(totalNotifications);

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: false,
          read_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (error) throw error;

      CacheManager.invalidate(CACHE_KEY);
      CacheManager.invalidate(COUNT_CACHE_KEY);
    } catch (err) {
      console.error('Error marking all notifications as unread:', err);
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const refresh = useCallback(async () => {
    CacheManager.invalidate(CACHE_KEY);
    CacheManager.invalidate(COUNT_CACHE_KEY);
    await fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification update received:', payload);
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    markAllAsUnread,
    refresh,
  };
};