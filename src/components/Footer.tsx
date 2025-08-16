
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import UpdateStatusDialog from '@/components/UpdateStatusDialog';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useAuth } from '@/hooks/useAuthReliable';
import { RefreshCw, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { hasUpdate, isUpdating, currentVersion, checkForUpdates, applyUpdate } = usePWAUpdate();

  const handleCheckUpdates = async () => {
    await checkForUpdates();
    setShowUpdateDialog(true);
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };


  return (
    <footer className="bg-slate-gray dark:bg-slate-900 text-cream py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
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

          {/* Removed AI Joke section */}
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
