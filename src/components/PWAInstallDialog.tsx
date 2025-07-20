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
  // Device and browser detection
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isSamsung = /SamsungBrowser/.test(userAgent);

  const getInstallInstructions = () => {
    if (isInstallable && (isChrome || isEdge)) {
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

    if (isIOS && isSafari) {
      return {
        title: "Add to Home Screen (iOS Safari)",
        description: "Install RootedAI as an app on your iPhone or iPad.",
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

    if (isIOS && isChrome) {
      return {
        title: "Add to Home Screen (iOS Chrome)",
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

    if (isAndroid && isChrome) {
      return {
        title: "Install App (Android Chrome)",
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

    if (isAndroid && isSamsung) {
      return {
        title: "Install App (Samsung Internet)",
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

    if (isFirefox) {
      return {
        title: "Install App (Firefox)",
        description: "Add RootedAI using Firefox browser.",
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

    // Desktop fallback
    if (isChrome || isEdge) {
      return {
        title: "Install App (Desktop)",
        description: "Install RootedAI on your computer.",
        steps: [
          "Look for the install icon in your address bar",
          "Or click the menu (three dots) and select 'Install RootedAI'",
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