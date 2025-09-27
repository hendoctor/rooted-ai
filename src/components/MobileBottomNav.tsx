import React from 'react';
import { Home, LayoutDashboard, Bell, User, Menu as MenuIcon, Loader2, BellDot, CheckCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SimpleMenuManager, SimpleMenuRoute } from '@/utils/simpleMenuUtils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

const NAV_HEIGHT = 76;

const createDemoNotifications = (): Notification[] => {
  const now = Date.now();
  return [
    {
      id: 'demo-1',
      title: 'Welcome to RootedAI',
      message: 'Explore how we centralize AI tools, strategic growth, and compliance.',
      notification_type: 'announcement',
      reference_id: 'demo-1',
      is_read: false,
      priority: 'medium',
      created_at: new Date(now - 1000 * 60 * 10).toISOString(),
      content_title: 'Discover the RootedAI Hub Experience',
      content_url: 'https://rooted.ai',
    },
    {
      id: 'demo-2',
      title: 'Client Demo Portal',
      message: 'Jump into the interactive demo to see KPI tracking and onboarding flows.',
      notification_type: 'ai_tool',
      reference_id: 'demo-2',
      is_read: false,
      priority: 'low',
      created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      content_title: 'Visit the Client Demo Portal',
      content_url: '/client-demo',
    },
    {
      id: 'demo-3',
      title: 'Stay in the Loop',
      message: 'Enable notifications when you sign in to receive personalized updates.',
      notification_type: 'useful_link',
      reference_id: 'demo-3',
      is_read: true,
      priority: 'low',
      created_at: new Date(now - 1000 * 60 * 90).toISOString(),
      content_title: 'Learn more about RootedAI',
      content_url: 'https://rooted.ai',
    },
  ];
};

const getMenuSections = (items: SimpleMenuRoute[]) => {
  const anchors = items.filter(item => item.path.startsWith('#'));
  const pages = items.filter(item => item.path.startsWith('/') && item.label.trim() !== 'HUB »');
  const external = items.filter(item => !item.path.startsWith('#') && !item.path.startsWith('/'));

  return [
    anchors.length > 0 && {
      title: 'On this page',
      description: 'Jump to sections across the RootedAI overview.',
      items: anchors,
    },
    pages.length > 0 && {
      title: 'Portals & pages',
      description: 'Navigate to dedicated RootedAI experiences.',
      items: pages,
    },
    external.length > 0 && {
      title: 'External resources',
      description: 'Open additional resources in a new tab.',
      items: external,
    },
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    items: SimpleMenuRoute[];
  }>;
};

const MobileBottomNav: React.FC = () => {
  const { user, userRole, companies } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const isAuthenticated = Boolean(user);

  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    markAllAsUnread,
    markAsRead,
    markAsUnread,
  } = useNotifications();

  const [demoNotifications, setDemoNotifications] = React.useState<Notification[]>(() => createDemoNotifications());

  const menuItems = React.useMemo(
    () => SimpleMenuManager.getMenuItems(userRole || null, location.pathname),
    [userRole, location.pathname],
  );

  const menuSections = React.useMemo(() => getMenuSections(menuItems), [menuItems]);

  const clientPath = React.useMemo(() => {
    if (!isAuthenticated) {
      return '/client-demo';
    }

    if (userRole === 'Client' && companies && companies.length > 0) {
      return `/${companies[0].slug}`;
    }

    if (userRole === 'Admin') {
      return '/admin';
    }

    return '/';
  }, [companies, isAuthenticated, userRole]);

  const clientLabel = isAuthenticated ? 'Client Page' : 'Client Demo';

  const isClientActive = clientPath !== '/' && location.pathname === clientPath;

  const demoUnreadCount = React.useMemo(() => demoNotifications.filter(notification => !notification.is_read).length, [demoNotifications]);

  const totalUnread = isAuthenticated ? unreadCount : demoUnreadCount;

  const navigateHome = () => {
    if (location.pathname !== '/') {
      navigate('/');
      return;
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClientNavigation = () => {
    if (clientPath === '/') {
      navigateHome();
      return;
    }

    navigate(clientPath);
  };

  const navigateToPath = (path: string) => {
    if (path.startsWith('#')) {
      const anchor = path;

      const scrollToAnchor = () => {
        if (typeof window !== 'undefined') {
          const element = document.querySelector(anchor);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };

      if (location.pathname !== '/') {
        navigate(`/${anchor}`);
        setTimeout(scrollToAnchor, 150);
      } else {
        scrollToAnchor();
      }
      return;
    }

    if (path.startsWith('/')) {
      navigate(path);
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(path, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMenuItemClick = (item: SimpleMenuRoute) => {
    setIsMenuOpen(false);
    navigateToPath(item.path);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (isAuthenticated) {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      if (notification.content_url) {
        if (notification.content_url.startsWith('http')) {
          window.open(notification.content_url, '_blank');
        } else {
          navigate(notification.content_url);
        }
      }

      setIsNotificationsOpen(false);
      toast({
        title: 'Notification opened',
        description: notification.content_title || notification.title,
      });
      return;
    }

    setDemoNotifications(prev => prev.map(item => (
      item.id === notification.id
        ? { ...item, is_read: true }
        : item
    )));

    toast({
      title: notification.title,
      description: 'Sign in to receive personalized RootedAI notifications.',
    });

    if (notification.content_url) {
      if (notification.content_url.startsWith('http')) {
        window.open(notification.content_url, '_blank');
      } else {
        navigate(notification.content_url);
      }
    }
  };

  const handleToggleNotification = async (notification: Notification) => {
    if (isAuthenticated) {
      if (notification.is_read) {
        await markAsUnread(notification.id);
        return;
      }
      await markAsRead(notification.id);
      return;
    }

    setDemoNotifications(prev => prev.map(item => (
      item.id === notification.id
        ? { ...item, is_read: !item.is_read }
        : item
    )));
  };

  const handleMarkAll = async (read: boolean) => {
    if (isAuthenticated) {
      if (read) {
        await markAllAsRead();
      } else {
        await markAllAsUnread();
      }
      return;
    }

    setDemoNotifications(prev => prev.map(item => ({ ...item, is_read: read ? true : false })));
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updatePadding = () => {
      if (window.innerWidth <= 768) {
        document.body.style.paddingBottom = `${NAV_HEIGHT + 16}px`;
      } else {
        document.body.style.paddingBottom = '';
      }
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);

    return () => {
      window.removeEventListener('resize', updatePadding);
      document.body.style.paddingBottom = '';
    };
  }, []);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            type="button"
            onClick={navigateHome}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              location.pathname === '/' ? 'text-forest-green' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="RootedAI home"
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-medium">RootedAI</span>
          </button>

          <button
            type="button"
            onClick={handleClientNavigation}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              isClientActive ? 'text-forest-green' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={clientLabel}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[11px] font-medium">{clientLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              isNotificationsOpen ? 'text-forest-green' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {totalUnread > 0 && (
              <Badge className="absolute -top-1 right-2 h-4 px-1 text-[10px] bg-forest-green text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </Badge>
            )}
            <span className="text-[11px] font-medium">Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/profile' : '/auth')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              location.pathname.startsWith('/profile') ? 'text-forest-green' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
            <span className="text-[11px] font-medium">Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              isMenuOpen ? 'text-forest-green' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-5 w-5" />
            <span className="text-[11px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          <SheetHeader className="px-6 pt-6 pb-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" /> Notifications
            </SheetTitle>
            <SheetDescription>
              {isAuthenticated ? 'Stay up to date with your latest RootedAI alerts.' : 'Preview how RootedAI keeps your clients informed.'}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 pb-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleMarkAll(true)}
              disabled={isAuthenticated && loading}
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleMarkAll(false)}
              disabled={isAuthenticated && loading}
            >
              <BellDot className="mr-2 h-4 w-4" /> Mark all as unread
            </Button>
          </div>

          <ScrollArea className="h-[calc(85vh-180px)] px-6 pb-6">
            {isAuthenticated && loading && notifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm font-medium">Loading notifications...</p>
              </div>
            ) : (isAuthenticated ? notifications : demoNotifications).length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2 text-center">
                <CheckCheck className="h-8 w-8" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs max-w-sm">
                  {isAuthenticated ? 'You have no new notifications right now.' : 'Sign in to see personalized updates for your organization.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {(isAuthenticated ? notifications : demoNotifications).map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    onToggleRead={handleToggleNotification}
                    disabled={isAuthenticated && loading}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          <SheetHeader className="px-6 pt-6 pb-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <MenuIcon className="h-5 w-5" /> Navigation
            </SheetTitle>
            <SheetDescription>
              Explore RootedAI sections and pages from a familiar mobile menu.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(85vh-140px)] px-6 pb-8">
            {menuSections.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2 text-center">
                <p className="text-sm font-medium">No additional navigation items available.</p>
              </div>
            ) : (
              <div className="space-y-8 pb-6">
                {menuSections.map(section => (
                  <div key={section.title} className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {section.items.map(item => (
                        <Button
                          key={item.label}
                          variant="outline"
                          className="justify-start text-left"
                          onClick={() => handleMenuItemClick(item)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileBottomNav;
