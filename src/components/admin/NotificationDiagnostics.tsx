import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, Users, Mail } from 'lucide-react';
import { TableSkeleton } from '../skeletons/TableSkeleton';

interface DiagnosticData {
  company_id: string;
  company_name: string;
  total_members: number;
  recent_content_assignments: number;
  recent_notifications: number;
  notification_errors: number;
}

export const NotificationDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_notification_diagnostics');

      if (error) throw error;

      setDiagnostics(data || []);
    } catch (err) {
      console.error('Error fetching notification diagnostics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch diagnostics';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const backfillNotifications = async (companyId?: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('backfill_missing_notifications', {
        p_company_id: companyId || null,
        p_hours_back: 24
      });

      if (error) throw error;

      toast({
        title: "Backfill Complete",
        description: `Notifications have been backfilled for the last 24 hours.`,
      });

      // Refresh diagnostics after backfill
      await fetchDiagnostics();
    } catch (err) {
      console.error('Error backfilling notifications:', err);
      toast({
        title: "Backfill Error",
        description: err instanceof Error ? err.message : 'Failed to backfill notifications',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const getHealthStatus = (diagnostic: DiagnosticData) => {
    if (diagnostic.notification_errors > 0) return 'error';
    if (diagnostic.recent_content_assignments > diagnostic.recent_notifications) return 'warning';
    return 'healthy';
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Errors
        </Badge>;
      case 'warning':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Issues
        </Badge>;
      case 'healthy':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Healthy
        </Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Notification System Diagnostics
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => backfillNotifications()}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Backfill All Missing
            </Button>
            <Button
              onClick={fetchDiagnostics}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <TableSkeleton />}

        {!loading && diagnostics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No diagnostic data available
          </div>
        )}

        {!loading && diagnostics.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {diagnostics.map((diagnostic) => {
                const healthStatus = getHealthStatus(diagnostic);
                return (
                  <Card key={diagnostic.company_id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">{diagnostic.company_name}</h4>
                        {getHealthBadge(healthStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {diagnostic.total_members} members
                        </div>
                        <div className="text-right">
                          {diagnostic.recent_content_assignments} assignments
                        </div>
                        <div className="text-muted-foreground">
                          Notifications sent
                        </div>
                        <div className="text-right font-medium">
                          {diagnostic.recent_notifications}
                        </div>
                      </div>

                      {diagnostic.notification_errors > 0 && (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertTriangle className="w-3 h-3" />
                          {diagnostic.notification_errors} errors (24h)
                        </div>
                      )}

                      {healthStatus !== 'healthy' && (
                        <Button
                          onClick={() => backfillNotifications(diagnostic.company_id)}
                          disabled={loading}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Fix Notifications
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Data shows last 24 hours of activity</span>
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};