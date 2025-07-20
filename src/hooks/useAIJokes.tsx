
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { usePushNotifications, type JokeFrequency } from './usePushNotifications';
import { useAuth } from './useAuth';

export { type JokeFrequency } from './usePushNotifications';

export const useAIJokes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);
  
  const { user, loading: authLoading } = useAuth();
  const pushNotifications = usePushNotifications();

  // Check initial state on mount
  useEffect(() => {
    if (!authLoading) {
      initializeNotifications();
    }
  }, [authLoading]);

  const initializeNotifications = async () => {
    // Only initialize service worker - authentication is handled by push notifications hook
    await registerServiceWorker();
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        console.log('Service Worker registered successfully');
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        
        // Get current notification status from service worker
        await getNotificationStatus();
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        toast({
          title: "Service Worker Error",
          description: "Failed to register service worker for notifications.",
          variant: "destructive"
        });
      }
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, version, state } = event.data;
    
    switch (type) {
      case 'SW_UPDATED':
        console.log(`Service Worker updated to version ${version}`);
        break;
      case 'NOTIFICATION_STATUS':
        setNotificationStatus(state);
        break;
    }
  };

  const getNotificationStatus = useCallback(async () => {
    if (!serviceWorkerRegistration?.active) return;
    
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      const { type, state } = event.data;
      if (type === 'NOTIFICATION_STATUS') {
        setNotificationStatus(state);
      }
    };
    
    serviceWorkerRegistration.active.postMessage(
      { type: 'GET_NOTIFICATION_STATUS' },
      [messageChannel.port2]
    );
  }, [serviceWorkerRegistration]);

  const toggleJokes = async () => {
    // Check authentication first
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to enable AI joke notifications. This allows us to save your preferences and send background notifications.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (pushNotifications.isEnabled) {
        await pushNotifications.disableNotifications();
        toast({
          title: "AI Jokes Disabled",
          description: "You'll no longer receive joke notifications.",
        });
      } else {
        await pushNotifications.enableNotifications();
        // Success toast is handled by the push notifications hook
      }
      
      // Get updated status
      setTimeout(() => {
        getNotificationStatus();
      }, 1000);
    } catch (error) {
      console.error('Error toggling jokes:', error);
      toast({
        title: "Error",
        description: "Failed to toggle AI jokes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFrequency = async (newFrequency: JokeFrequency) => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to customize your joke frequency.",
        variant: "destructive"
      });
      return;
    }

    await pushNotifications.updateFrequency(newFrequency);
  };

  const sendTestJoke = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to send test notifications.",
        variant: "destructive"
      });
      return;
    }

    await pushNotifications.sendTestNotification();
  };

  const getFrequencyDescription = (freq: JokeFrequency) => {
    if (freq.type === 'specific_days') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const selectedDays = freq.days?.map(day => dayNames[day]).join(', ') || '';
      return `Jokes will be sent on: ${selectedDays}`;
    } else {
      const value = freq.value || 1;
      const unit = freq.type === 'minutes' && value === 1 ? 'minute' : 
                   freq.type === 'hours' && value === 1 ? 'hour' :
                   freq.type === 'days' && value === 1 ? 'day' : freq.type;
      return `Jokes will be sent every ${value > 1 ? value + ' ' : ''}${unit}`;
    }
  };

  // Periodic status check - only if authenticated
  useEffect(() => {
    if (serviceWorkerRegistration && user) {
      const interval = setInterval(getNotificationStatus, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [serviceWorkerRegistration, user, getNotificationStatus]);

  return {
    // Include authentication status in the return
    isAuthenticated: !!user,
    isAuthLoading: authLoading,
    isEnabled: user ? pushNotifications.isEnabled : false,
    hasPermission: user ? pushNotifications.hasPermission : false,
    isLoading: pushNotifications.isLoading || isLoading || authLoading,
    frequency: pushNotifications.frequency,
    notificationStatus,
    isSubscribed: user ? pushNotifications.isSubscribed : false,
    toggleJokes,
    sendTestJoke,
    updateFrequency,
    getFrequencyDescription,
    getNotificationStatus
  };
};
