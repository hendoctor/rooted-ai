import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { usePushNotifications, type JokeFrequency } from './usePushNotifications';

export { type JokeFrequency } from './usePushNotifications';

export const useAIJokes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);
  
  // Use the new push notifications hook
  const pushNotifications = usePushNotifications();

  // Check initial state on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    // Register service worker for legacy support
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
    if (pushNotifications.isEnabled) {
      await pushNotifications.disableNotifications();
    } else {
      await pushNotifications.enableNotifications();
    }
    
    // Get updated status
    setTimeout(() => {
      getNotificationStatus();
    }, 1000);
  };

  const updateFrequency = (newFrequency: JokeFrequency) => {
    pushNotifications.updateFrequency(newFrequency);
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

  // Periodic status check
  useEffect(() => {
    if (serviceWorkerRegistration) {
      const interval = setInterval(getNotificationStatus, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [serviceWorkerRegistration, getNotificationStatus]);

  return {
    isEnabled: pushNotifications.isEnabled,
    hasPermission: pushNotifications.hasPermission,
    isLoading: pushNotifications.isLoading || isLoading,
    frequency: pushNotifications.frequency,
    notificationStatus,
    isSubscribed: pushNotifications.isSubscribed,
    toggleJokes,
    sendTestJoke: pushNotifications.sendTestNotification,
    updateFrequency,
    getFrequencyDescription,
    getNotificationStatus
  };
};