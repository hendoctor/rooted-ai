import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
  isOpen,
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`
        relative
        text-slate-gray dark:text-white 
        hover:text-forest-green dark:hover:text-white/80
        transition-all duration-200
        ${isOpen ? 'text-forest-green' : ''}
      `}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="
            absolute -top-1 -right-1 
            h-5 w-5 p-0 
            flex items-center justify-center 
            text-xs font-medium
            bg-destructive text-destructive-foreground
            border-2 border-background
            animate-pulse-scale
          "
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};