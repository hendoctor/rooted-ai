import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, User, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusConfig } from '@/utils/sessionStatusConfig';

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

interface SessionDetailsDialogProps {
  session: SessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  session,
  open,
  onOpenChange,
}) => {
  if (!session) return null;

  const statusConfig = getStatusConfig(session.session_status || 'Scheduled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-forest-green" />
            Session Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Session Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-semibold text-forest-green dark:text-sage">
                {session.topic}
              </h3>
              <Badge
                variant="secondary" 
                className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} ${statusConfig.animate || ''}`}
              >
                {session.session_status || 'Scheduled'}
              </Badge>
            </div>
            
            {session.description && (
              <p className="text-muted-foreground leading-relaxed">
                {session.description}
              </p>
            )}
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.session_date && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Calendar className="h-4 w-4 text-forest-green" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(session.session_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(session.session_date), 'h:mm a')}
                  </p>
                </div>
              </div>
            )}
            
            {session.session_duration && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Clock className="h-4 w-4 text-forest-green" />
                <div>
                  <p className="text-sm font-medium text-foreground">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {session.session_duration} minutes
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Session Leader */}
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
              return null;
            };

            const leaderName = getLeaderDisplayName(session);
            return (leaderName || session.leader_email) ? (
              <div className="p-4 rounded-lg border bg-gradient-to-r from-sage/5 to-forest-green/5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={session.leader_avatar_url || ''} 
                      alt={leaderName || session.leader_email || 'Session leader'}
                    />
                    <AvatarFallback className="bg-forest-green text-white">
                      {(leaderName || session.leader_email || 'SL')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-forest-green dark:text-sage">
                      {leaderName || 'Session Leader'}
                    </p>
                    {session.leader_email && (
                      <p className="text-sm text-muted-foreground">
                        {session.leader_email}
                      </p>
                    )}
                  </div>
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ) : null;
          })()}

          {/* Session Details/Notes */}
          {(session.session_notes || session.media) && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-forest-green" />
                Session Details
              </h4>
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {session.media || session.session_notes}
                </p>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {session.contact && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-forest-green" />
                Contact Information
              </h4>
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-sm text-foreground leading-relaxed">
                  {session.contact}
                </p>
              </div>
            </div>
          )}

          {/* Session Process/Steps */}
          {session.steps && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-forest-green" />
                Session Process
              </h4>
              <div className="p-4 rounded-lg bg-background/50 border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {session.steps}
                </p>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {session.meeting_link && (
            <div className="flex items-center justify-center pt-4 border-t">
              <a
                href={session.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-forest-green text-cream hover:bg-forest-green/90 rounded-lg font-medium transition-colors"
              >
                <Video className="h-4 w-4" />
                Join Session
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsDialog;