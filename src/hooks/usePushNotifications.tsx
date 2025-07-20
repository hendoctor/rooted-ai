import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useAuthFix } from './useAuthFix';

export interface JokeFrequency {
  type: 'minutes' | 'hours' | 'days' | 'specific_days';
  value?: number;
  days?: number[];
}

interface PushNotificationsHook {
  isEnabled: boolean;
  isLoading: boolean;
  hasPermission: boolean;
  frequency: JokeFrequency;
  isSubscribed: boolean;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  updateFrequency: (frequency: JokeFrequency) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
}

const VAPID_PUBLIC_KEY = "BBJeaLq3cweiE_oIJB4EuAIv5Ivua5xmh8IZI68nfmohnsbqtQq6l9_ARSQmDHDNrxUiZRK5UiXW74QuGhSpcKqY";

export function usePushNotifications(): PushNotificationsHook {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [frequency, setFrequency] = useState<JokeFrequency>({
    type: 'minutes',
    value: 5,
  });
  const { toast } = useToast();
  
  // Ensure user profile exists
  useAuthFix();

  // Check notification permission on mount
  useEffect(() => {
    checkNotificationPermission();
    loadUserSettings();
  }, []);

  const checkNotificationPermission = useCallback(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const loadUserSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setIsEnabled(data.enabled);
        setFrequency({
          type: data.frequency_type as JokeFrequency['type'],
          value: data.frequency_value || 5,
          days: data.frequency_days || undefined,
        });
      }

      // Check subscription status
      await checkSubscriptionStatus();
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setIsSubscribed(data && data.length > 0);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setHasPermission(granted);

    if (!granted) {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings to receive jokes.",
        variant: "destructive",
      });
    }

    return granted;
  }, [toast]);

  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: "Subscription Failed",
        description: "Failed to set up push notifications. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const saveSubscription = useCallback(async (subscription: PushSubscription): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const subscriptionObject = subscription.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscriptionObject.keys?.p256dh || '',
          auth_key: subscriptionObject.keys?.auth || '',
          user_agent: navigator.userAgent,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }, []);

  const calculateNextNotification = useCallback((freq: JokeFrequency): Date => {
    const now = new Date();
    
    switch (freq.type) {
      case 'minutes':
        return new Date(now.getTime() + freq.value * 60 * 1000);
      case 'hours':
        return new Date(now.getTime() + freq.value * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + freq.value * 24 * 60 * 60 * 1000);
      case 'specific_days':
        if (!freq.days || freq.days.length === 0) {
          return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        
        const currentDay = now.getDay();
        const nextDay = freq.days.find(day => day > currentDay) ?? freq.days[0];
        const daysUntilNext = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
        
        return new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 5 * 60 * 1000);
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to enable notifications.",
          variant: "destructive",
        });
        return;
      }

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      const subscription = await subscribeToPush();
      if (!subscription) return;

      await saveSubscription(subscription);

      // Save user settings
      const nextNotification = calculateNextNotification(frequency);
      
      const { error: settingsError } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          enabled: true,
          frequency_type: frequency.type,
          frequency_value: frequency.value,
          frequency_days: frequency.days || null,
        });

      if (settingsError) throw settingsError;

      // Create or update notification schedule
      const { error: scheduleError } = await supabase
        .from('notification_schedules')
        .upsert({
          user_id: user.id,
          next_notification_at: nextNotification.toISOString(),
        });

      if (scheduleError) throw scheduleError;

      setIsEnabled(true);
      setIsSubscribed(true);

      toast({
        title: "Notifications Enabled!",
        description: "You'll now receive jokes even when the app is closed.",
      });

    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to set up notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [frequency, requestNotificationPermission, subscribeToPush, saveSubscription, calculateNextNotification, toast]);

  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update settings
      const { error: settingsError } = await supabase
        .from('user_notification_settings')
        .update({ enabled: false })
        .eq('user_id', user.id);

      if (settingsError) throw settingsError;

      // Remove subscription
      const { error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (subscriptionError) throw subscriptionError;

      // Remove schedule
      const { error: scheduleError } = await supabase
        .from('notification_schedules')
        .delete()
        .eq('user_id', user.id);

      if (scheduleError) throw scheduleError;

      setIsEnabled(false);
      setIsSubscribed(false);

      toast({
        title: "Notifications Disabled",
        description: "You'll no longer receive background notifications.",
      });

    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateFrequency = useCallback(async (newFrequency: JokeFrequency) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setFrequency(newFrequency);

      if (isEnabled) {
        const nextNotification = calculateNextNotification(newFrequency);

        const { error: settingsError } = await supabase
          .from('user_notification_settings')
          .update({
            frequency_type: newFrequency.type,
            frequency_value: newFrequency.value,
            frequency_days: newFrequency.days || null,
          })
          .eq('user_id', user.id);

        if (settingsError) throw settingsError;

        const { error: scheduleError } = await supabase
          .from('notification_schedules')
          .update({ next_notification_at: nextNotification.toISOString() })
          .eq('user_id', user.id);

        if (scheduleError) throw scheduleError;

        toast({
          title: "Frequency Updated",
          description: "Your notification schedule has been updated.",
        });
      }
    } catch (error) {
      console.error('Error updating frequency:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification frequency.",
        variant: "destructive",
      });
    }
  }, [isEnabled, calculateNextNotification, toast]);

  const sendTestNotification = useCallback(async () => {
    try {
      if (!hasPermission) {
        await requestNotificationPermission();
        return;
      }

      // Show local test notification
      new Notification("🎭 Test Notification", {
        body: "This is a test notification from your Joke App!",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });

      toast({
        title: "Test Sent",
        description: "Check if you received the test notification!",
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification.",
        variant: "destructive",
      });
    }
  }, [hasPermission, requestNotificationPermission, toast]);

  return {
    isEnabled,
    isLoading,
    hasPermission,
    frequency,
    isSubscribed,
    enableNotifications,
    disableNotifications,
    updateFrequency,
    sendTestNotification,
    checkSubscriptionStatus,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}