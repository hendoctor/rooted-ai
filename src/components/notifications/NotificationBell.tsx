import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
  isOpen
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative text-slate-gray dark:text-white hover:text-forest-green dark:hover:text-white/80 transition-colors ${
        isOpen ? 'text-forest-green' : ''
      }`}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-forest-green text-white text-xs font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-scale-in"
          style={{ fontSize: '10px' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
};