import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Extend Navigator interface for iOS standalone detection
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      // Check for iOS standalone mode
      const isIOSStandalone = window.navigator.standalone === true;
      
      // Check for Android/Chrome installed app
      const isAndroidInstalled = window.matchMedia('(display-mode: standalone)').matches;
      
      return isIOSStandalone || isAndroidInstalled;
    };

    setIsInstalled(checkIfInstalled());

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "RootedAI has been installed successfully.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const installApp = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support the install prompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isIOS && isSafari) {
        toast({
          title: "Install App",
          description: "To install this app on your iOS device, tap the Share button and then 'Add to Home Screen'.",
          duration: 8000,
        });
      } else {
        toast({
          title: "Install App",
          description: "To install this app, look for the install option in your browser's menu or address bar.",
          duration: 5000,
        });
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast({
          title: "Installing...",
          description: "The app is being installed on your device.",
        });
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast({
        title: "Installation Error",
        description: "There was an error installing the app. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    isInstallable: isInstallable && !isInstalled,
    isInstalled,
    installApp,
  };
};