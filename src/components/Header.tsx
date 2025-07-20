
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sprout, LogOut, User, Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import PWAInstallDialog from './PWAInstallDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const { user, signOut } = useAuth();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Team', href: '#team' },
    { name: 'Contact', href: '#contact' }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
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
            <img 
              src="/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
              alt="RootedAI Logo" 
              className="w-8 h-8" 
            />
            <span className="text-xl lg:text-2xl font-bold text-forest-green">RootedAI</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-slate-gray dark:text-cream hover:text-forest-green transition-colors duration-200 font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* CTA Button / Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-slate-gray dark:text-cream">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-sage hover:bg-sage/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth">
                  <Button variant="outline" className="border-sage hover:bg-sage/20 dark:text-cream">
                    Sign In
                  </Button>
                </Link>
                <Button className="bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg">
                  Book a Workshop
                </Button>
              </div>
            )}
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
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors duration-200 font-medium px-4 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="px-4 pt-2 space-y-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-slate-gray dark:text-white text-sm">
                      <User className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-sage hover:bg-sage/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link to="/auth">
                      <Button variant="outline" className="w-full border-sage hover:bg-sage/20 dark:text-white">
                        Sign In
                      </Button>
                    </Link>
                    <Button className="w-full bg-forest-green dark:bg-[hsl(139_28%_25%)] hover:bg-forest-green/90 dark:hover:bg-[hsl(139_28%_20%)] text-white py-2 rounded-lg">
                      Book a Workshop
                    </Button>
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
