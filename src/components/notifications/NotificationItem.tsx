import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  FileText, 
  Bot, 
  Link, 
  HelpCircle, 
  Video, 
  BarChart3,
  Circle 
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (notification: Notification) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'announcement':
      return <Bell className="w-4 h-4" />;
    case 'resource':
      return <FileText className="w-4 h-4" />;
    case 'ai_tool':
      return <Bot className="w-4 h-4" />;
    case 'useful_link':
      return <Link className="w-4 h-4" />;
    case 'faq':
      return <HelpCircle className="w-4 h-4" />;
    case 'coaching':
      return <Video className="w-4 h-4" />;
    case 'kpi':
      return <BarChart3 className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-forest-green';
    case 'low':
      return 'text-slate-gray';
    default:
      return 'text-slate-gray';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onNavigate
}) => {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onNavigate?.(notification);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  return (
    <div
      className={`p-3 border-b border-border last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
        !notification.is_read ? 'bg-forest-green/5 border-l-4 border-l-forest-green' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 p-2 rounded-full bg-muted ${getPriorityColor(notification.priority)}`}>
          {getNotificationIcon(notification.notification_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium text-sm leading-tight ${
              !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {notification.title}
            </h4>
            
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-forest-green/20"
                aria-label="Mark as read"
              >
                <Circle className="w-3 h-3 text-forest-green" />
              </Button>
            )}
          </div>
          
          <p className={`text-xs mt-1 line-clamp-2 ${
            !notification.is_read ? 'text-muted-foreground' : 'text-muted-foreground/80'
          }`}>
            {notification.message}
          </p>
          
          {notification.content_title && (
            <p className="text-xs text-forest-green mt-1 font-medium">
              {notification.content_title}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <time className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </time>
            
            <span className={`text-xs px-2 py-1 rounded-full bg-muted ${getPriorityColor(notification.priority)}`}>
              {notification.priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};