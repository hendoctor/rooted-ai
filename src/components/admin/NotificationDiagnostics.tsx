import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, Users, Mail, Building2 } from 'lucide-react';
import { TableSkeleton } from '../skeletons/TableSkeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface DiagnosticData {
  company_id: string;
  company_name: string;
  total_members: number;
  recent_content_assignments: number;
  recent_notifications: number;
  notification_errors: number;
}

interface NotificationHistoryEntry {
  id: string;
  company_id: string;
  company_name: string;
  title: string | null;
  message: string | null;
  notification_type: string | null;
  created_at: string;
}

interface NotificationHistoryRow {
  id: string;
  company_id: string | null;
  created_at: string;
  title: string | null;
  message: string | null;
  notification_type: string | null;
  company: {
    name: string | null;
  } | null;
}

interface NotificationHistoryGroup {
  companyId: string;
  companyName: string;
  entries: NotificationHistoryEntry[];
}

export const NotificationDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryEntry[]>([]);
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

  const fetchNotificationHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select('id, company_id, created_at, title, message, notification_type, company:companies(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedHistory = (data as NotificationHistoryRow[] | null)?.map((item) => {
        const companyId = item.company_id ?? 'unknown';
        const fallbackName = item.company_id ? 'Unknown Company' : 'Unassigned Notifications';
        const companyName = item.company?.name ?? fallbackName;

        return {
          id: item.id,
          company_id: companyId,
          company_name: companyName,
          title: item.title,
          message: item.message,
          notification_type: item.notification_type,
          created_at: item.created_at,
        };
      }) ?? [];

      setNotificationHistory(formattedHistory);
    } catch (err) {
      console.error('Error fetching notification history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notification history';
      setHistoryError(errorMessage);
      toast({
        title: 'History Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
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

  const formatNotificationType = (type: string | null) =>
    type ? type.replace(/_/g, ' ').toLowerCase() : 'general';

  const handleHistoryOpenChange = (open: boolean) => {
    setIsHistoryDialogOpen(open);
    if (open) {
      fetchNotificationHistory();
    }
  };

  const groupedHistory = useMemo<NotificationHistoryGroup[]>(() => {
    const groups = new Map<string, NotificationHistoryGroup>();

    notificationHistory.forEach((entry) => {
      const existing = groups.get(entry.company_id);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.set(entry.company_id, {
          companyId: entry.company_id,
          companyName: entry.company_name,
          entries: [entry],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.companyName.localeCompare(b.companyName)
    );
  }, [notificationHistory]);

  return (
    <Dialog open={isHistoryDialogOpen} onOpenChange={handleHistoryOpenChange}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-forest-green">
              <Mail className="w-5 h-5 text-forest-green" />
              Notification System Diagnostics
            </CardTitle>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-full bg-forest-green hover:bg-forest-green/90 sm:w-auto"
                >
                  Notification History
                </Button>
              </DialogTrigger>
              <Button
                onClick={() => backfillNotifications()}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full border-forest-green text-forest-green hover:bg-forest-green/10 sm:w-auto"
              >
                Backfill All Missing
              </Button>
              <Button
                onClick={fetchDiagnostics}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full border-forest-green text-forest-green hover:bg-forest-green/10 sm:w-auto"
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

      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl text-forest-green">Notification history</DialogTitle>
          <DialogDescription>
            Recent notifications grouped by company. Showing up to the last 100 activity entries.
          </DialogDescription>
        </DialogHeader>

        {historyError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{historyError}</AlertDescription>
          </Alert>
        )}

        {historyLoading ? (
          <div className="py-6">
            <TableSkeleton />
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-4">
            {groupedHistory.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No notification history available.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedHistory.map((group) => (
                  <div
                    key={group.companyId}
                    className="rounded-lg border border-forest-green/20 bg-muted/40 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-forest-green">
                        <Building2 className="h-4 w-4" />
                        <h3 className="text-sm font-semibold">{group.companyName}</h3>
                      </div>
                      <Badge variant="outline" className="bg-forest-green/10 text-forest-green border-forest-green/30">
                        {group.entries.length}{' '}
                        {group.entries.length === 1 ? 'notification' : 'notifications'}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-3">
                      {group.entries.slice(0, 5).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-md border border-border/60 bg-background/60 p-3 shadow-sm"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {entry.title || 'Notification'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-forest-green/10 text-forest-green border-forest-green/30 capitalize"
                                >
                                  {formatNotificationType(entry.notification_type)}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.created_at), 'MMM d, yyyy • h:mm a')}
                              </span>
                            </div>
                            {entry.message && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {entry.message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {group.entries.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          Showing latest 5 of {group.entries.length} notifications for this company.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotificationHistory}
            disabled={historyLoading}
            className="border-forest-green text-forest-green hover:bg-forest-green/10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh History
          </Button>
          <DialogClose asChild>
            <Button size="sm" className="bg-forest-green hover:bg-forest-green/90">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};