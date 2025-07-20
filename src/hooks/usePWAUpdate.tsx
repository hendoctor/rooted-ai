import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PWAUpdateHook {
  hasUpdate: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

export const usePWAUpdate = (): PWAUpdateHook => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
        if (reg) {
          setRegistration(reg);
          
          // Listen for service worker updates
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (newSW) {
              setNewWorker(newSW);
              
              newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available
                  setHasUpdate(true);
                  setUpdateAvailable(true);
                  
                  toast({
                    title: "🚀 Update Available!",
                    description: "A new version of the app is ready. Click to update.",
                    duration: 10000,
                  });
                }
              });
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, version } = event.data;
            
            if (type === 'SW_UPDATED') {
              console.log(`Service Worker updated to version ${version}`);
              
              toast({
                title: "✅ App Updated!",
                description: `Successfully updated to version ${version}`,
                duration: 5000,
              });
            }
          });

          // Check for waiting service worker
          if (reg.waiting) {
            setNewWorker(reg.waiting);
            setHasUpdate(true);
            setUpdateAvailable(true);
          }
        }
      });
    }
  }, [toast]);

  const checkForUpdates = useCallback(async () => {
    if (!registration) return;
    
    try {
      await registration.update();
      
      // Manual version check via message channel
      if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const { type, version } = event.data;
          if (type === 'VERSION_INFO') {
            console.log(`Current version: ${version}`);
          }
        };
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'CHECK_FOR_UPDATES' },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast({
        title: "Update Check Failed",
        description: "Unable to check for updates. Please try again later.",
        variant: "destructive"
      });
    }
  }, [registration, toast]);

  const applyUpdate = useCallback(async () => {
    if (!newWorker) return;
    
    setIsUpdating(true);
    
    try {
      // Tell the new service worker to skip waiting
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to become active
      const waitForActivation = new Promise<void>((resolve) => {
        const handleStateChange = () => {
          if (newWorker.state === 'activated') {
            newWorker.removeEventListener('statechange', handleStateChange);
            resolve();
          }
        };
        
        if (newWorker.state === 'activated') {
          resolve();
        } else {
          newWorker.addEventListener('statechange', handleStateChange);
        }
      });
      
      await waitForActivation;
      
      // Reload the page to use the new service worker
      window.location.reload();
    } catch (error) {
      console.error('Failed to apply update:', error);
      setIsUpdating(false);
      
      toast({
        title: "Update Failed",
        description: "Failed to apply the update. Please refresh the page manually.",
        variant: "destructive"
      });
    }
  }, [newWorker, toast]);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
    setUpdateAvailable(false);
    setNewWorker(null);
  }, []);

  // Periodic update check (every 30 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    hasUpdate,
    isUpdating,
    updateAvailable,
    checkForUpdates,
    applyUpdate,
    dismissUpdate
  };
};