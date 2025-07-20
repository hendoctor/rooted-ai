import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface JokeFrequency {
  type: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'specific_days';
  value?: number;
  days?: number[]; // For specific_days: 0=Sunday, 1=Monday, etc.
}

export const useAIJokes = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [frequency, setFrequency] = useState<JokeFrequency>({ type: 'minutes', value: 5 });

  // Check initial state on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('ai-jokes-enabled');
    const enabled = savedPreference === 'true';
    setIsEnabled(enabled);

    // Load saved frequency
    const savedFrequency = localStorage.getItem('ai-jokes-frequency');
    if (savedFrequency) {
      try {
        const parsedFrequency = JSON.parse(savedFrequency);
        setFrequency(parsedFrequency);
      } catch (error) {
        console.error('Error parsing saved frequency:', error);
      }
    }

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
          const savedFrequency = localStorage.getItem('ai-jokes-frequency');
          let freq = frequency;
          if (savedFrequency) {
            try {
              freq = JSON.parse(savedFrequency);
            } catch (error) {
              console.error('Error parsing saved frequency:', error);
            }
          }
          registration.active?.postMessage({ 
            type: 'AI_JOKE_TOGGLE', 
            enabled: true, 
            frequency: freq 
          });
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
            enabled: true,
            frequency: frequency
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
          enabled: false,
          frequency: frequency
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

  const updateFrequency = (newFrequency: JokeFrequency) => {
    setFrequency(newFrequency);
    localStorage.setItem('ai-jokes-frequency', JSON.stringify(newFrequency));
    
    // Update service worker with new frequency
    if (serviceWorkerRegistration && isEnabled) {
      serviceWorkerRegistration.active?.postMessage({
        type: 'UPDATE_FREQUENCY',
        frequency: newFrequency
      });
      
      toast({
        title: "Frequency Updated",
        description: getFrequencyDescription(newFrequency),
      });
    }
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
                   freq.type === 'days' && value === 1 ? 'day' :
                   freq.type === 'weeks' && value === 1 ? 'week' :
                   freq.type === 'months' && value === 1 ? 'month' :
                   freq.type === 'years' && value === 1 ? 'year' : freq.type;
      return `Jokes will be sent every ${value > 1 ? value + ' ' : ''}${unit}`;
    }
  };

  return {
    isEnabled,
    hasPermission,
    isLoading,
    frequency,
    toggleJokes,
    sendTestJoke,
    updateFrequency,
    getFrequencyDescription
  };
};