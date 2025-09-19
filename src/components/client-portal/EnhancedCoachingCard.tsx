import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusConfig } from '@/utils/sessionStatusConfig';
import EmptyState from './EmptyState';
import SessionDetailsDialog from './SessionDetailsDialog';

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
  session_notes?: string;
  media?: string;
  contact?: string;
  steps?: string;
  session_leader_id?: string;
}

interface EnhancedCoachingCardProps {
  sessions?: SessionData[];
  nextSession?: string; // Keep for backward compatibility
}

const EnhancedCoachingCard: React.FC<EnhancedCoachingCardProps> = ({ 
  sessions, 
  nextSession 
}) => {
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openSessionDetails = (session: SessionData) => {
    setSelectedSession(session);
    setDetailsOpen(true);
  };
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
          {/* Session Leader - Prominent Display */}
          {(() => {
            const getLeaderDisplayName = (session: SessionData): string => {
              if (session.leader_name) return session.leader_name;
              if (session.session_leader_id) {
                switch (session.session_leader_id) {
                  case '25ecad6a-1bd6-4a1f-a766-bab1bf730166': return 'James Hennahane';
                  case 'philip-rootedai': return 'Philip Niemerg';
                  default:
                    if (session.session_leader_id.startsWith('company-')) {
                      return 'Company Representative';
                    }
                    return 'Session Leader';
                }
              }
              return 'TBD';
            };

            return (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-forest-green" />
                  <span className="text-sm font-medium text-forest-green">
                    {getLeaderDisplayName(session)}
                  </span>
                </div>
                {(() => {
                  const statusConfig = getStatusConfig(session.session_status || 'Scheduled');
                  return (
                    <Badge 
                      variant="secondary" 
                      className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} ${statusConfig.animate || ''}`}
                    >
                      {session.session_status || 'Scheduled'}
                    </Badge>
                  );
                })()}
              </div>
            );
          })()}

          {/* Session Header */}
          <div className="mb-3">
            <h4 className="font-medium text-foreground mb-1">
              {session.topic}
            </h4>
            {session.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {session.description}
              </p>
            )}
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


          {/* Action Buttons */}
          <div className="flex gap-2">
            {session.meeting_link ? (
              <>
                <Button 
                  size="sm" 
                  className="flex-1 bg-forest-green text-cream hover:bg-forest-green/90"
                  onClick={() => window.open(session.meeting_link, '_blank')}
                >
                  <Video className="h-3 w-3 mr-1" />
                  Join Session
                </Button>
                {(session.session_notes || session.media || session.contact || session.steps) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openSessionDetails(session)}
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                )}
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => openSessionDetails(session)}
              >
                <FileText className="h-3 w-3 mr-1" />
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

      <SessionDetailsDialog
        session={selectedSession}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default EnhancedCoachingCard;