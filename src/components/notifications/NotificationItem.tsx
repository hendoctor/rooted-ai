import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Megaphone, 
  FileText, 
  Bot, 
  Link, 
  HelpCircle, 
  Users, 
  BarChart3,
  Circle
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'announcement':
      return <Megaphone className="w-4 h-4" />;
    case 'resource':
      return <FileText className="w-4 h-4" />;
    case 'ai_tool':
      return <Bot className="w-4 h-4" />;
    case 'useful_link':
      return <Link className="w-4 h-4" />;
    case 'faq':
      return <HelpCircle className="w-4 h-4" />;
    case 'coaching':
      return <Users className="w-4 h-4" />;
    case 'kpi':
      return <BarChart3 className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-forest-green';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
}) => {
  const handleClick = () => {
    onClick(notification);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true 
  });

  return (
    <div
      onClick={handleClick}
      className={`
        group p-4 cursor-pointer transition-all duration-200
        hover:bg-muted/50 border-l-4
        ${notification.is_read 
          ? 'border-l-transparent bg-background' 
          : 'border-l-forest-green bg-forest-green/5'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 p-2 rounded-full 
          ${notification.is_read ? 'bg-muted' : 'bg-forest-green/10'}
          ${getPriorityColor(notification.priority)}
        `}>
          {getNotificationIcon(notification.notification_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`
                text-sm font-medium leading-tight
                ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}
              `}>
                {notification.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              {notification.content_title && (
                <p className="text-xs font-medium text-forest-green mt-1">
                  {notification.content_title}
                </p>
              )}
            </div>
            
            {!notification.is_read && (
              <div className="w-2 h-2 bg-forest-green rounded-full flex-shrink-0 ml-2 mt-1"></div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>
            {notification.priority === 'high' && (
              <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
                High Priority
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};