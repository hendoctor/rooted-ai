import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Shield, Users, Eye } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  user_id?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export const SecurityAuditMonitor = () => {
  const { userRole } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'Admin') {
      fetchSecurityEvents();
      
      // Set up real-time subscription for security events
      const channel = supabase
        .channel('security-audit-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'security_audit_log'
          },
          (payload) => {
            setEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRole]);

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents((data || []) as SecurityEvent[]);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('invalid')) {
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
    if (eventType.includes('role') || eventType.includes('admin')) {
      return <Users className="w-4 h-4 text-amber-500" />;
    }
    if (eventType.includes('login') || eventType.includes('auth')) {
      return <Shield className="w-4 h-4 text-primary" />;
    }
    return <Eye className="w-4 h-4 text-muted-foreground" />;
  };

  const getEventSeverity = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('invalid')) {
      return 'destructive';
    }
    if (eventType.includes('role') || eventType.includes('admin')) {
      return 'secondary';
    }
    return 'default';
  };

  if (userRole !== 'Admin') {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Audit Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Audit Monitor
          <Badge variant="outline" className="ml-auto">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No security events recorded yet.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
              >
                {getEventIcon(event.event_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getEventSeverity(event.event_type)} className="text-xs">
                      {event.event_type.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  {event.event_details && (
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(event.event_details).map(([key, value]) => (
                        <div key={key} className="truncate">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                  {event.ip_address && (
                    <div className="text-xs text-muted-foreground mt-1">
                      IP: {event.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};