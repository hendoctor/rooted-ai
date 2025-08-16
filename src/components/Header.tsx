import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import PWAInstallDialog from './PWAInstallDialog';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '@/hooks/useAuthReliable';
import { RBACManager } from '@/utils/rbacUtils';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [accessibleRoutes, setAccessibleRoutes] = useState<Array<{
    label: string;
    path: string;
    isActive: boolean;
    isExternal: boolean;
  }>>([]);
  
  const { user, userRole, companies, signOut, loading } = useAuth();
  const location = useLocation();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Build accessible navigation menu
  useEffect(() => {
    const buildMenu = async () => {
      try {
        // Base navigation items for home page
        const baseNavItems = [
          { name: 'About', href: '#about' },
          { name: 'Services', href: '#services' },
          { name: 'Reviews', href: '#reviews' },
          { name: 'Team', href: '#team' },
          { name: 'Contact', href: '#contact' }
        ];

        // Only add app routes if auth is loaded
        let appRoutes: any[] = [];
        if (!loading) {
          appRoutes = await RBACManager.getAccessibleRoutes(userRole, companies);
        }
        
        // Combine base nav with accessible routes
        const allItems = [
          ...baseNavItems.map(item => ({
            label: item.name,
            path: item.href,
            isActive: false,
            isExternal: false
          })),
          ...(loading ? [] : RBACManager.buildNavigationMenu(appRoutes, location.pathname)
            .filter(route => route.path !== '/')) // Don't duplicate home
        ];

        setAccessibleRoutes(allItems);
      } catch (error) {
        console.error('Failed to build navigation menu:', error);
        // Fallback to base navigation only
        const baseNavItems = [
          { name: 'About', href: '#about' },
          { name: 'Services', href: '#services' },
          { name: 'Reviews', href: '#reviews' },
          { name: 'Team', href: '#team' },
          { name: 'Contact', href: '#contact' }
        ];
        setAccessibleRoutes(baseNavItems.map(item => ({
          label: item.name,
          path: item.href,
          isActive: false,
          isExternal: false
        })));
      }
    };

    buildMenu();
  }, [userRole, companies, location.pathname, loading]);

  const handleSignOut = async () => {
    console.log('🔄 Header: Sign out button clicked');
    try {
      await signOut();
      console.log('✅ Header: Sign out successful');
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      console.error('❌ Header: Sign out failed:', error);
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavClick = (href: string) => {
    // If we're not on the home page and the href is an anchor, navigate to home with anchor
    if (location.pathname !== '/' && href.startsWith('#')) {
      return `/${href}`;
    }
    return href;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
            ? 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a href="#home" className="flex items-center space-x-2">
              <img
                src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                alt="RootedAI Logo"
                className="w-8 h-8"
              />
              <span className="text-xl lg:text-2xl font-bold text-forest-green">RootedAI</span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {accessibleRoutes.map((item) => {
                const targetHref = handleNavClick(item.path);
                return item.path.startsWith('/') || targetHref.startsWith('/') ? (
                  <Link
                    key={item.label}
                    to={targetHref}
                    className="text-slate-gray dark:text-white hover:text-forest-green transition-colors duration-200 font-medium"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.path}
                    className="text-slate-gray dark:text-white hover:text-forest-green transition-colors duration-200 font-medium"
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* CTA Button / Auth */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Theme toggle and PWA install */}
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                {(isInstallable || !isInstalled) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Install app"
                    onClick={() => setShowInstallDialog(true)}
                    className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                )}
              </div>
              
              {/* Auth buttons */}
              {user ? (
                <ProfileMenu onSignOut={handleSignOut} />
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/auth">
                    <Button variant="outline" className="border-sage hover:bg-sage/20 dark:text-white">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="md:hidden flex items-center space-x-2">
              {(isInstallable || !isInstalled) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Install app"
                  onClick={() => setShowInstallDialog(true)}
                  className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80"
                >
                  <Download className="w-5 h-5" />
                </Button>
              )}
              <ThemeToggle />
              <button
                className="p-2 text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-white dark:bg-slate-900 border-t border-sage/20 dark:border-sage/50 py-4 animate-fade-in">
              <nav className="flex flex-col space-y-4">
                {accessibleRoutes.map((item) => {
                  const targetHref = handleNavClick(item.path);
                  return item.path.startsWith('/') || targetHref.startsWith('/') ? (
                    <Link
                      key={item.label}
                      to={targetHref}
                      className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors duration-200 font-medium px-4 py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.path}
                      className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors duration-200 font-medium px-4 py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                })}
                
                <div className="px-4 pt-2 space-y-2">
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-slate-gray dark:text-white text-sm">
                        <span>
                          {user.email}
                          {userRole && ` (${userRole})`}
                        </span>
                      </div>
                      <Link to="/profile">
                        <Button 
                          variant="outline" 
                          className="w-full border-sage hover:bg-sage/20 mb-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Profile
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full border-sage hover:bg-sage/20"
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link to="/auth">
                        <Button 
                          variant="outline" 
                          className="w-full border-sage hover:bg-sage/20 dark:text-white"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>

        {/* PWA Install Dialog */}
        <PWAInstallDialog
          open={showInstallDialog}
          onOpenChange={setShowInstallDialog}
          onInstall={installApp}
          isInstallable={isInstallable}
        />
      </header>
  );
};

export default Header;