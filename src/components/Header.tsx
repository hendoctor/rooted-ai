import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import PWAInstallDialog from './PWAInstallDialog';
import ProfileMenu from './ProfileMenu';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { SimpleMenuManager } from '@/utils/simpleMenuUtils';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [menuItems, setMenuItems] = useState<Array<{
    label: string;
    path: string;
    isActive: boolean;
    isExternal: boolean;
  }>>([]);
  
  const { user, userRole, signOut, companies } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const showPWAInstall = isInstallable || !isInstalled;
  const { toast } = useToast();

  let companyName: string | null = null;
  if (userRole && companies && companies.length > 0) {
    if (userRole === 'Admin') {
      const companyParam = searchParams.get('company');
      const matched = companies.find(c => c.slug === companyParam);
      companyName = matched?.name || null;
    } else {
      companyName = companies[0].name;
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simplified menu based on the 3 rules
  useEffect(() => {
    setMenuItems(SimpleMenuManager.getMenuItems(userRole, location.pathname));
  }, [user, userRole, location.pathname]);

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

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setIsMobileMenuOpen(false);

    if (location.pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Ensure we scroll to the top after navigating home
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleNotificationNavigate = (notification: any) => {
    // Navigate based on notification type and content
    if (notification.content_url) {
      window.open(notification.content_url, '_blank');
    } else {
      // Navigate to relevant page based on notification type
      switch (notification.notification_type) {
        case 'announcement':
        case 'resource':
        case 'ai_tool':
        case 'useful_link':
        case 'faq':
        case 'coaching':
        case 'kpi':
          // Navigate to client portal if user has companies
          if (companies && companies.length > 0) {
            navigate(`/${companies[0].slug}`);
          }
          break;
        default:
          break;
      }
    }
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
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2" onClick={handleLogoClick}>
                <img
                  src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
                  alt="RootedAI Logo"
                  className="w-8 h-8"
                />
                <span className="text-xl lg:text-2xl font-bold text-forest-green">RootedAI</span>
              </Link>
              {companyName && (
                <>
                  <span className="text-slate-gray">•</span>
                     {userRole === 'Client' ? (
                      <Link
                        to={`/${companies[0]?.slug}`}
                        className="text-slate-gray hover:text-forest-green transition-colors duration-200"
                      >
                        {companyName}
                      </Link>
                    ) : (
                      <span className="text-slate-gray">{companyName}</span>
                    )}
                </>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.map((item) => {
                const targetHref = handleNavClick(item.path);
                const isHubLink = item.label.trim() === 'HUB »';
                const content = isHubLink ? (
                  <span className="inline-flex items-center gap-1">
                    <span>HUB</span>
                    <span className="text-forest-green animate-pulse">»</span>
                  </span>
                ) : (
                  item.label
                );

                return item.path.startsWith('/') || targetHref.startsWith('/') ? (
                  <Link
                    key={item.label}
                    to={targetHref}
                    className="text-slate-gray dark:text-white hover:text-forest-green transition-colors duration-200 font-medium"
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.path}
                    className="text-slate-gray dark:text-white hover:text-forest-green transition-colors duration-200 font-medium"
                  >
                    {content}
                  </a>
                );
              })}
            </nav>

            {/* CTA Button / Auth */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Theme toggle and notifications */}
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                {user && <NotificationCenter />}
              </div>
              
              {/* Auth buttons */}
              {user ? (
                <ProfileMenu
                  onSignOut={handleSignOut}
                  onInstallClick={() => setShowInstallDialog(true)}
                  showPWAInstall={showPWAInstall}
                />
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
                {menuItems.map((item) => {
                  const targetHref = handleNavClick(item.path);
                  const isHubLink = item.label.trim() === 'HUB »';
                  const content = isHubLink ? (
                    <span className="inline-flex items-center gap-1">
                      <span>HUB</span>
                      <span className="text-forest-green animate-pulse">»</span>
                    </span>
                  ) : (
                    item.label
                  );
                  return item.path.startsWith('/') || targetHref.startsWith('/') ? (
                    <Link
                      key={item.label}
                      to={targetHref}
                      className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors duration-200 font-medium px-4 py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.path}
                      className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors duration-200 font-medium px-4 py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {content}
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
                      {userRole === 'Client' && (
                        <>
                          {companies && companies.length > 0 && (
                            <Link to={`/${companies[0].slug}`}>
                              <Button
                                variant="outline"
                                className="w-full border-sage hover:bg-sage/20 mb-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Client Portal
                              </Button>
                            </Link>
                          )}
                          <Link to="/profile">
                            <Button
                              variant="outline"
                              className="w-full border-sage hover:bg-sage/20 mb-2"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              Profile
                            </Button>
                          </Link>
                        </>
                      )}
                      {showPWAInstall && (
                        <Button
                          variant="outline"
                          className="w-full border-sage hover:bg-sage/20 mb-2 flex items-center justify-center gap-2"
                          onClick={() => {
                            setShowInstallDialog(true);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Install RootedAI PWA
                        </Button>
                      )}
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
