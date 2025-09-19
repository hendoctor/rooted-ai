import React, { useState, useRef, useEffect } from 'react';
import { NotificationBell } from './NotificationBell';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

interface NotificationCenterProps {
  onNavigate?: (notification: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  const handleNavigate = (notification: Notification) => {
    setIsOpen(false);
    onNavigate?.(notification);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <NotificationBell
        unreadCount={unreadCount}
        onClick={handleBellClick}
        isOpen={isOpen}
      />
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            error={error}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onRefresh={refresh}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </div>
  );
};