
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIJokes } from '@/hooks/useAIJokes';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import FrequencySelector from '@/components/FrequencySelector';
import UpdateStatusDialog from '@/components/UpdateStatusDialog';
import { RefreshCw, Lock, Download, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const { 
    isEnabled, 
    hasPermission, 
    isLoading, 
    frequency, 
    toggleJokes, 
    sendTestJoke, 
    updateFrequency, 
    getFrequencyDescription 
  } = useAIJokes();
  
  const { hasUpdate, isUpdating, currentVersion, checkForUpdates, applyUpdate } = usePWAUpdate();
  const { isInstalled, canInstall, installPWA } = usePWAInstall();

  const handleCheckUpdates = async () => {
    await checkForUpdates();
    setShowUpdateDialog(true);
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  const renderAIJokesSection = () => {
    // Don't show anything while auth is loading
    if (authLoading) {
      return null;
    }

    // PWA not installed - show install prompt first
    if (!isInstalled) {
      return (
        <Card className="bg-slate-800/50 border-sage/20">
          <CardHeader>
            <CardTitle className="text-cream dark:text-white flex items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="text-forest-green">Install PWA for AI Jokes</span>
            </CardTitle>
            <CardDescription className="text-sage dark:text-white">
              Install RootedAI as a PWA to enable background AI joke notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canInstall && (
              <Button
                onClick={installPWA}
                className="bg-forest-green hover:bg-forest-green/90 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Install PWA
              </Button>
            )}
            {!canInstall && (
              <p className="text-sm text-sage/70">
                Visit this site on your mobile device or desktop to install as a PWA.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    // PWA installed but user not signed in
    if (!user) {
      return (
        <Card className="bg-slate-800/50 border-sage/20">
          <CardHeader>
            <CardTitle className="text-cream dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <span className="text-forest-green">AI Joke Machine for RootedAI</span>
            </CardTitle>
            <CardDescription className="text-sage dark:text-white">
              Sign in to enable personalized AI joke notifications with custom frequency settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-900/20 p-4 rounded border border-amber-500/20">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-amber-400 font-medium mb-1">Authentication Required</h4>
                  <p className="text-sm text-amber-200/80 mb-3">
                    Sign in to save your joke preferences and receive background notifications even when the app is closed.
                  </p>
                  <Button
                    onClick={handleSignInClick}
                    className="bg-forest-green hover:bg-forest-green/90 text-white"
                  >
                    Sign In to Enable AI Jokes
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // User is signed in and PWA is installed - show full functionality
    return (
      <Card className="bg-slate-800/50 border-sage/20">
        <CardHeader>
          <CardTitle className="text-cream dark:text-white flex items-center gap-2">
            🤖 <span className="text-forest-green">AI Joke Machine for RootedAI</span>
          </CardTitle>
          <CardDescription className="text-sage dark:text-white">
            Get personalized AI jokes delivered as background notifications!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Switch
                checked={isEnabled}
                onCheckedChange={toggleJokes}
                disabled={isLoading}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-forest-green font-medium">
                {isEnabled ? "AI Jokes Enabled" : "Enable AI Jokes"}
              </span>
            </div>
            {hasPermission && (
              <Button
                onClick={sendTestJoke}
                variant="outline"
                size="sm"
                className="text-sage dark:text-white border-sage/30 hover:bg-sage/10"
              >
                Send Joke Now
              </Button>
            )}
          </div>

          <FrequencySelector
            frequency={frequency}
            onFrequencyChange={updateFrequency}
            disabled={isLoading || !isEnabled}
          />

          {isEnabled && (
            <div className="bg-emerald-900/20 p-3 rounded border border-emerald-500/20">
              <p className="text-sm text-forest-green flex items-center gap-2">
                <span className="text-green-400">✅</span>
                AI Joke notifications are active! {getFrequencyDescription(frequency)}
              </p>
              <p className="text-xs text-sage/70 mt-1">
                Signed in as: {user.email}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <footer className="bg-slate-gray dark:bg-slate-900 text-cream py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                alt="RootedAI Logo" 
                className="w-8 h-8" 
              />
              <span className="text-2xl font-bold text-cream dark:text-white">RootedAI</span>
            </div>
            <p className="text-sage dark:text-white mb-4 max-w-md">
              Helping Kansas City small businesses grow smarter with AI solutions built on Microsoft tools. 
              Local expertise, trusted partnerships, sustainable growth.
            </p>
            <p className="text-lg font-semibold text-sage dark:text-white">
              Grow Smarter. Stay Rooted.
            </p>
          </div>

          {/* AI Joke Notifications Section */}
          {renderAIJokesSection()}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-sage/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sage dark:text-white text-sm mb-4 md:mb-0">
            © {currentYear} RootedAI. All rights reserved. | Overland Park, KS
          </div>
          <div className="flex items-center gap-4">
            {!user && (
              <Button
                onClick={handleSignInClick}
                variant="ghost"
                size="sm"
                className="text-sage/70 hover:text-sage dark:text-white/70 dark:hover:text-white hover:bg-sage/10"
              >
                <User className="h-3 w-3 mr-2" />
                Sign In
              </Button>
            )}
            <Button
              onClick={handleCheckUpdates}
              variant="ghost"
              size="sm"
              className="text-sage/70 hover:text-sage dark:text-white/70 dark:hover:text-white hover:bg-sage/10"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Check for Updates
            </Button>
          </div>
        </div>
      </div>

      {/* Update Status Dialog */}
      <UpdateStatusDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        hasUpdate={hasUpdate}
        currentVersion={currentVersion}
        isUpdating={isUpdating}
        onApplyUpdate={applyUpdate}
      />
    </footer>
  );
};

export default Footer;
