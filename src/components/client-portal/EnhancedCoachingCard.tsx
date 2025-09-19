import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusConfig } from '@/utils/sessionStatusConfig';
import EmptyState from './EmptyState';

interface SessionLeader {
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface SessionData {
  id: string;
  topic: string;
  description?: string;
  session_date?: string;
  session_duration?: number;
  session_status?: string;
  meeting_link?: string;
  leader_name?: string;
  leader_email?: string;
  leader_avatar_url?: string;
}

interface EnhancedCoachingCardProps {
  sessions?: SessionData[];
  nextSession?: string; // Keep for backward compatibility
}

const EnhancedCoachingCard: React.FC<EnhancedCoachingCardProps> = ({ 
  sessions, 
  nextSession 
}) => {
  // If no enhanced sessions data, fall back to old format
  if (!sessions || sessions.length === 0) {
    if (!nextSession) {
      return <EmptyState message="No upcoming sessions scheduled. Book a session to get started." />;
    }
    
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Next session: {nextSession}</p>
        <Button className="w-full bg-forest-green text-cream hover:bg-forest-green/90">
          Book a 30-min session
        </Button>
      </div>
    );
  }

  // Show enhanced session cards
  return (
    <div className="space-y-4">
      {sessions.slice(0, 3).map((session) => (
        <div 
          key={session.id}
          className="p-4 rounded-lg border bg-gradient-to-r from-sage/5 to-forest-green/5 hover:from-sage/10 hover:to-forest-green/10 transition-colors"
        >
          {/* Session Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-foreground mb-1">
                {session.topic}
              </h4>
              {session.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
            {(() => {
              const statusConfig = getStatusConfig(session.session_status || 'Scheduled');
              return (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} ${statusConfig.animate || ''}`}
                >
                  {session.session_status || 'Scheduled'}
                </Badge>
              );
            })()}
          </div>

          {/* Session Details */}
          <div className="space-y-2 mb-3">
            {session.session_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(session.session_date), 'MMM d, yyyy')}
                </span>
                <Clock className="h-3 w-3 ml-2" />
                <span>
                  {format(new Date(session.session_date), 'h:mm a')}
                </span>
                {session.session_duration && (
                  <span className="text-xs">
                    ({session.session_duration} min)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Session Leader */}
          {(session.leader_name || session.leader_email) && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded bg-background/50">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={session.leader_avatar_url || ''} 
                  alt={session.leader_name || session.leader_email || 'Session leader'}
                />
                <AvatarFallback className="bg-forest-green text-white text-xs">
                  {(session.leader_name || session.leader_email || 'SL')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  }
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {session.leader_name || 'Session Leader'}
                </p>
                {session.leader_email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {session.leader_email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex gap-2">
            {session.meeting_link ? (
              <Button 
                size="sm" 
                className="flex-1 bg-forest-green text-cream hover:bg-forest-green/90"
                onClick={() => window.open(session.meeting_link, '_blank')}
              >
                <Video className="h-3 w-3 mr-1" />
                Join Session
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
              >
                <Calendar className="h-3 w-3 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-4">
          <Button className="w-full bg-forest-green text-cream hover:bg-forest-green/90">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule First Session
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedCoachingCard;