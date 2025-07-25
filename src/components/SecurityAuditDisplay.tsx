import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  user_id?: string | null;
  event_details?: any;
}

interface SecurityStats {
  total_events: number;
  critical_events: number;
  rate_limit_violations: number;
  recent_events: SecurityEvent[];
}

const SecurityAuditDisplay = () => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityStats = async () => {
      try {
        // Get recent security events
        const { data: recentEvents } = await supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Get event counts
        const { count: totalCount } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true });

        const { count: criticalCount } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .in('event_type', ['rate_limit_exceeded', 'unauthorized_access', 'csp_violation']);

        const { count: rateLimitCount } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'rate_limit_exceeded');

        setStats({
          total_events: totalCount || 0,
          critical_events: criticalCount || 0,
          rate_limit_violations: rateLimitCount || 0,
          recent_events: (recentEvents || []).map(event => ({
            ...event,
            ip_address: event.ip_address as string | null,
            user_agent: event.user_agent as string | null,
            user_id: event.user_id as string | null
          }))
        });
      } catch (error) {
        console.error('Failed to fetch security stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityStats();
  }, []);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'rate_limit_exceeded':
      case 'unauthorized_access':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'csp_violation':
        return <Shield className="h-4 w-4 text-orange-500" />;
      case 'contact_form_submitted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventType) {
      case 'rate_limit_exceeded':
      case 'unauthorized_access':
        return 'destructive';
      case 'csp_violation':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading security data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats?.total_events || 0}</p>
              </div>
              <Info className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Events</p>
                <p className="text-2xl font-bold text-red-600">{stats?.critical_events || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Limit Violations</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.rate_limit_violations || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {stats && stats.critical_events > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.critical_events} critical security events detected. Review the audit log below for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_events && stats.recent_events.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.event_type)}
                    <div>
                      <div className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                        {event.ip_address && ` • ${event.ip_address}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getEventBadgeVariant(event.event_type)}>
                    {event.event_type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No security events recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAuditDisplay;