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
  Circle,
  BellDot,
  Check
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onToggleRead: (notification: Notification) => void;
  disabled?: boolean;
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

const getPriorityBadge = (priority: string) => {
  if (priority === 'high') {
    return (
      <Badge className="bg-destructive/10 text-destructive border-transparent text-[10px] uppercase tracking-wide">
        High priority
      </Badge>
    );
  }

  if (priority === 'medium') {
    return (
      <Badge className="bg-forest-green/10 text-forest-green border-transparent text-[10px] uppercase tracking-wide">
        Medium priority
      </Badge>
    );
  }

  return null;
};

const getIconAccentClass = (notification: Notification) => {
  if (notification.priority === 'high') {
    return 'bg-destructive/10 text-destructive';
  }

  if (!notification.is_read) {
    return 'bg-forest-green/10 text-forest-green';
  }

  return 'bg-muted text-muted-foreground';
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onToggleRead,
  disabled,
}) => {
  const priorityBadge = getPriorityBadge(notification.priority);

  const handleClick = () => {
    onClick(notification);
  };

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleRead(notification);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true
  });

  return (
    <div
      onClick={handleClick}
      className={`
        group relative p-3 cursor-pointer transition-all duration-200
        rounded-xl border
        ${notification.is_read
          ? 'border-transparent bg-background hover:border-border'
          : 'border-forest-green/30 bg-forest-green/5 hover:bg-forest-green/10'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 p-2 rounded-lg transition-colors shadow-sm
          ${getIconAccentClass(notification)}
        `}>
          {getNotificationIcon(notification.notification_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className={`
                  text-sm font-semibold leading-tight truncate
                  ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}
               `}>
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="h-2 w-2 rounded-full bg-forest-green" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              {notification.content_title && (
                <p className="text-xs font-medium text-forest-green/90">
                  {notification.content_title}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`
                      h-7 w-7 transition-colors
                      ${notification.is_read
                        ? 'text-muted-foreground hover:text-forest-green'
                        : 'text-forest-green hover:text-forest-green/80'
                      }
                    `}
                    aria-label={notification.is_read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {notification.is_read ? (
                      <BellDot className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {notification.is_read ? 'Mark as unread' : 'Mark as read'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {priorityBadge && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {priorityBadge}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};