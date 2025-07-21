import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share, Plus, Menu, MoreVertical, Smartphone } from 'lucide-react';

interface PWAInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
  isInstallable: boolean;
}

const PWAInstallDialog: React.FC<PWAInstallDialogProps> = ({
  open,
  onOpenChange,
  onInstall,
  isInstallable
}) => {
  // Enhanced device and browser detection
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Operating System Detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isMacOS = /Mac/.test(platform) && !isIOS;
  const isWindows = /Win/.test(platform);
  const isLinux = /Linux/.test(platform) && !isAndroid;
  
  // Mobile vs Desktop Detection
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(userAgent);
  const isTablet = /iPad/.test(userAgent) || (isAndroid && !/Mobile/.test(userAgent));
  
  // Browser Detection - More comprehensive
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|EdgiOS|FxiOS/.test(userAgent);
  const isChrome = /Chrome|CriOS/.test(userAgent) && !/Edg|EdgiOS|OPR|Opera/.test(userAgent);
  const isEdge = /Edg|EdgiOS/.test(userAgent);
  const isFirefox = /Firefox|FxiOS/.test(userAgent);
  const isSamsung = /SamsungBrowser/.test(userAgent);
  const isOpera = /OPR|Opera/.test(userAgent);
  const isBrave = (navigator as unknown as { brave?: unknown }).brave !== undefined;
  
  // iOS specific browser detection
  const isChromeIOS = /CriOS/.test(userAgent);
  const isEdgeIOS = /EdgiOS/.test(userAgent);
  const isFirefoxIOS = /FxiOS/.test(userAgent);
  
  // Check if running in standalone mode (already installed)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const getInstallInstructions = () => {
    // Check if already installed
    if (isStandalone) {
      return {
        title: "App Already Installed",
        description: "RootedAI is already installed on your device.",
        steps: [
          "The app is currently running in standalone mode",
          "You can access it from your home screen or app drawer"
        ],
        icon: <Download className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Chrome/Edge with install prompt support (any platform)
    if (isInstallable && (isChrome || isEdge || isBrave) && !isMobile) {
      return {
        title: "Install RootedAI App",
        description: "Click the button below to install our app on your device.",
        steps: [
          "Click the 'Install App' button below",
          "Confirm the installation in the popup",
          "The app will be added to your device"
        ],
        hasDirectInstall: true
      };
    }

    // iOS Safari
    if (isIOS && isSafari) {
      return {
        title: `Add to Home Screen (${isTablet ? 'iPad' : 'iPhone'} Safari)`,
        description: "Install RootedAI as an app on your iOS device.",
        steps: [
          "Tap the Share button at the bottom of the screen",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' in the top right corner",
          "The app will appear on your home screen"
        ],
        icon: <Share className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // iOS Chrome
    if (isIOS && isChromeIOS) {
      return {
        title: `Add to Home Screen (${isTablet ? 'iPad' : 'iPhone'} Chrome)`,
        description: "Install RootedAI as an app using Chrome on iOS.",
        steps: [
          "Tap the Share button at the bottom of the screen",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm",
          "The app will appear on your home screen"
        ],
        icon: <Share className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // iOS Edge
    if (isIOS && isEdgeIOS) {
      return {
        title: `Add to Home Screen (${isTablet ? 'iPad' : 'iPhone'} Edge)`,
        description: "Install RootedAI as an app using Edge on iOS.",
        steps: [
          "Tap the Share button at the bottom of the screen",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm",
          "The app will appear on your home screen"
        ],
        icon: <Share className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // iOS Firefox
    if (isIOS && isFirefoxIOS) {
      return {
        title: `Add to Home Screen (${isTablet ? 'iPad' : 'iPhone'} Firefox)`,
        description: "Install RootedAI as an app using Firefox on iOS.",
        steps: [
          "Tap the menu (three lines) at the bottom",
          "Tap 'Share'",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm"
        ],
        icon: <Share className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Android Chrome
    if (isAndroid && isChrome) {
      return {
        title: `Install App (Android ${isTablet ? 'Tablet' : 'Phone'} Chrome)`,
        description: "Add RootedAI to your Android device.",
        steps: [
          "Tap the menu (three dots) in the top right",
          "Select 'Add to Home screen' or 'Install app'",
          "Tap 'Add' or 'Install' to confirm",
          "The app will be installed on your device"
        ],
        icon: <MoreVertical className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Android Edge
    if (isAndroid && isEdge) {
      return {
        title: `Install App (Android ${isTablet ? 'Tablet' : 'Phone'} Edge)`,
        description: "Add RootedAI using Edge on Android.",
        steps: [
          "Tap the menu (three dots) at the bottom",
          "Select 'Add to phone' or 'Install app'",
          "Tap 'Add' to confirm",
          "The app will be installed on your device"
        ],
        icon: <MoreVertical className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Samsung Internet
    if (isAndroid && isSamsung) {
      return {
        title: `Install App (Samsung Internet)`,
        description: "Add RootedAI using Samsung Internet browser.",
        steps: [
          "Tap the menu (three lines) at the bottom",
          "Select 'Add page to' → 'Home screen'",
          "Tap 'Add' to confirm",
          "The app will appear on your home screen"
        ],
        icon: <Menu className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Android Firefox
    if (isAndroid && isFirefox) {
      return {
        title: `Install App (Android Firefox)`,
        description: "Add RootedAI using Firefox on Android.",
        steps: [
          "Tap the menu (three dots) in the address bar",
          "Select 'Install' or 'Add to Home Screen'",
          "Follow the prompts to confirm",
          "The app will be installed"
        ],
        icon: <Plus className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Opera (Desktop and Mobile)
    if (isOpera) {
      return {
        title: `Install App (Opera ${isMobile ? 'Mobile' : 'Desktop'})`,
        description: "Add RootedAI using Opera browser.",
        steps: [
          isMobile ? "Tap the Opera menu" : "Click the Opera menu",
          "Look for 'Add to Home Screen' or 'Install'",
          "Follow the installation prompts",
          "The app will be available on your device"
        ],
        icon: <Download className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Desktop Firefox
    if (isFirefox && !isMobile) {
      return {
        title: "Install App (Desktop Firefox)",
        description: "Add RootedAI using Firefox browser.",
        steps: [
          "Look for the install icon in your address bar",
          "Or click the menu (three lines) and select 'Install This Site as an App'",
          "Follow the installation prompts",
          "The app will be available on your desktop"
        ],
        icon: <Download className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Desktop Chrome/Edge/Brave
    if ((isChrome || isEdge || isBrave) && !isMobile) {
      const browserName = isBrave ? 'Brave' : isEdge ? 'Edge' : 'Chrome';
      return {
        title: `Install App (Desktop ${browserName})`,
        description: `Install RootedAI on your ${isWindows ? 'Windows' : isMacOS ? 'Mac' : 'Linux'} computer.`,
        steps: [
          "Look for the install icon in your address bar",
          `Or click the menu (three dots) and select 'Install RootedAI'`,
          "Click 'Install' in the dialog",
          "The app will be added to your desktop"
        ],
        icon: <Download className="w-5 h-5" />,
        hasDirectInstall: false
      };
    }

    // Generic fallback
    return {
      title: "Add to Home Screen",
      description: "Install RootedAI for a better experience.",
      steps: [
        "Look for 'Add to Home Screen' or 'Install' in your browser menu",
        "Follow your browser's installation prompts", 
        "The app will be available on your device"
      ],
      icon: <Smartphone className="w-5 h-5" />,
      hasDirectInstall: false
    };
  };

  const instructions = getInstallInstructions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {instructions.icon || <Download className="w-5 h-5" />}
            {instructions.title}
          </DialogTitle>
          <DialogDescription>
            {instructions.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <ol className="space-y-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>

          {instructions.hasDirectInstall && (
            <div className="flex gap-2 pt-4">
              <Button onClick={onInstall} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}

          {!instructions.hasDirectInstall && (
            <div className="pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Got it
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallDialog;