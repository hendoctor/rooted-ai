import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useAIJokes = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check initial state on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('ai-jokes-enabled');
    const enabled = savedPreference === 'true';
    setIsEnabled(enabled);

    // Check notification permission
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }

    // Register service worker
    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        console.log('Service Worker registered successfully');
        
        // If jokes were enabled, restart them
        const savedPreference = localStorage.getItem('ai-jokes-enabled');
        if (savedPreference === 'true' && Notification.permission === 'granted') {
          registration.active?.postMessage({ type: 'AI_JOKE_TOGGLE', enabled: true });
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Notifications are not supported in this browser.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings to receive AI jokes.",
          variant: "destructive"
        });
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const toggleJokes = async () => {
    setIsLoading(true);
    
    try {
      if (!isEnabled) {
        // Enabling jokes
        const permissionGranted = hasPermission || await requestNotificationPermission();
        
        if (permissionGranted && serviceWorkerRegistration) {
          setIsEnabled(true);
          localStorage.setItem('ai-jokes-enabled', 'true');
          
          // Start jokes in service worker
          serviceWorkerRegistration.active?.postMessage({ 
            type: 'AI_JOKE_TOGGLE', 
            enabled: true 
          });
          
          toast({
            title: "🤖 AI Jokes Activated!",
            description: "You'll receive a funny AI joke every 5 minutes!",
          });
        }
      } else {
        // Disabling jokes
        setIsEnabled(false);
        localStorage.setItem('ai-jokes-enabled', 'false');
        
        // Stop jokes in service worker
        serviceWorkerRegistration?.active?.postMessage({ 
          type: 'AI_JOKE_TOGGLE', 
          enabled: false 
        });
        
        toast({
          title: "AI Jokes Disabled",
          description: "No more joke notifications will be sent.",
        });
      }
    } catch (error) {
      console.error('Error toggling jokes:', error);
      toast({
        title: "Error",
        description: "Failed to toggle joke notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestJoke = () => {
    if (serviceWorkerRegistration && hasPermission) {
      serviceWorkerRegistration.active?.postMessage({ type: 'SEND_JOKE_NOW' });
      toast({
        title: "Test Joke Sent!",
        description: "Check your notifications for the joke.",
      });
    } else {
      toast({
        title: "Cannot Send Joke",
        description: "Please enable notifications first.",
        variant: "destructive"
      });
    }
  };

  return {
    isEnabled,
    hasPermission,
    isLoading,
    toggleJokes,
    sendTestJoke
  };
};