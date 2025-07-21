import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

export const NotificationDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});
  const { toast } = useToast();

  const runDebugCheck = async () => {
    const info: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      notifications: {},
      serviceWorker: {},
      permissions: {},
      user: {},
      database: {}
    };

    try {
      // Check notification support
      info.notifications.supported = 'Notification' in window;
      info.notifications.permission = Notification.permission;
      
      // Check service worker
      info.serviceWorker.supported = 'serviceWorker' in navigator;
      if (info.serviceWorker.supported) {
        const registration = await navigator.serviceWorker.getRegistration();
        info.serviceWorker.registered = !!registration;
        info.serviceWorker.active = !!registration?.active;
        info.serviceWorker.waiting = !!registration?.waiting;
        info.serviceWorker.installing = !!registration?.installing;
      }

      // Check push manager
      if (info.serviceWorker.registered) {
        const registration = await navigator.serviceWorker.ready;
        info.serviceWorker.pushManager = 'pushManager' in registration;
        if (info.serviceWorker.pushManager) {
          try {
            const subscription = await registration.pushManager.getSubscription();
            info.serviceWorker.hasSubscription = !!subscription;
            if (subscription) {
              info.serviceWorker.endpoint = subscription.endpoint.substring(0, 50) + '...';
            }
          } catch (error) {
            info.serviceWorker.subscriptionError = error.message;
          }
        }
      }

      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      info.user.authenticated = !!user;
      info.user.id = user?.id;
      info.user.email = user?.email;
      info.user.error = userError?.message;

      if (user) {
        // Check database records
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        info.database.hasProfile = !!profile;
        info.database.profileError = profileError?.message;

        const { data: settings, error: settingsError } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        info.database.hasSettings = !!settings;
        info.database.settingsEnabled = settings?.enabled;
        info.database.settingsError = settingsError?.message;

        const { data: subscription, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        info.database.hasSubscription = !!subscription;
        info.database.subscriptionError = subError?.message;

        const { data: schedule, error: scheduleError } = await supabase
          .from('notification_schedules')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        info.database.hasSchedule = !!schedule;
        info.database.nextNotification = schedule?.next_notification_at;
        info.database.scheduleError = scheduleError?.message;
      }

    } catch (error) {
      info.error = error.message;
    }

    setDebugInfo(info);
  };

  const createProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.email,
          email: user.email
        });

      if (error) throw error;

      toast({
        title: "Profile Created",
        description: "User profile has been created successfully."
      });
      
      runDebugCheck();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    runDebugCheck();
  }, []);

  const getStatusColor = (status: boolean | undefined) => {
    if (status === true) return 'bg-green-500';
    if (status === false) return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Push Notification Debugger</CardTitle>
        <Button onClick={runDebugCheck} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugInfo.error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            Error: {debugInfo.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Browser Support */}
          <div className="space-y-2">
            <h3 className="font-semibold">Browser Support</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.notifications?.supported)}>
                  {debugInfo.notifications?.supported ? '✓' : '✗'}
                </Badge>
                Notifications: {debugInfo.notifications?.permission || 'unknown'}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.serviceWorker?.supported)}>
                  {debugInfo.serviceWorker?.supported ? '✓' : '✗'}
                </Badge>
                Service Worker Support
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.serviceWorker?.registered)}>
                  {debugInfo.serviceWorker?.registered ? '✓' : '✗'}
                </Badge>
                Service Worker Registered
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.serviceWorker?.pushManager)}>
                  {debugInfo.serviceWorker?.pushManager ? '✓' : '✗'}
                </Badge>
                Push Manager Available
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-2">
            <h3 className="font-semibold">Authentication</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.user?.authenticated)}>
                  {debugInfo.user?.authenticated ? '✓' : '✗'}
                </Badge>
                User Authenticated
              </div>
              {debugInfo.user?.email && (
                <div>Email: {debugInfo.user.email}</div>
              )}
              {debugInfo.user?.error && (
                <div className="text-red-600">Error: {debugInfo.user.error}</div>
              )}
            </div>
          </div>

          {/* Database Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Database Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.database?.hasProfile)}>
                  {debugInfo.database?.hasProfile ? '✓' : '✗'}
                </Badge>
                Profile Record
                {!debugInfo.database?.hasProfile && debugInfo.user?.authenticated && (
                  <Button onClick={createProfile} size="sm" variant="outline" className="ml-2">
                    Create Profile
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.database?.hasSettings)}>
                  {debugInfo.database?.hasSettings ? '✓' : '✗'}
                </Badge>
                Notification Settings
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.database?.hasSubscription)}>
                  {debugInfo.database?.hasSubscription ? '✓' : '✗'}
                </Badge>
                Push Subscription
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.database?.hasSchedule)}>
                  {debugInfo.database?.hasSchedule ? '✓' : '✗'}
                </Badge>
                Notification Schedule
              </div>
            </div>
          </div>

          {/* Service Worker Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Service Worker Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.serviceWorker?.active)}>
                  {debugInfo.serviceWorker?.active ? '✓' : '✗'}
                </Badge>
                Active Worker
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(debugInfo.serviceWorker?.hasSubscription)}>
                  {debugInfo.serviceWorker?.hasSubscription ? '✓' : '✗'}
                </Badge>
                Has Push Subscription
              </div>
              {debugInfo.serviceWorker?.endpoint && (
                <div>Endpoint: {debugInfo.serviceWorker.endpoint}</div>
              )}
              {debugInfo.serviceWorker?.subscriptionError && (
                <div className="text-red-600">Error: {debugInfo.serviceWorker.subscriptionError}</div>
              )}
            </div>
          </div>
        </div>

        {debugInfo.timestamp && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Last checked: {new Date(debugInfo.timestamp).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};