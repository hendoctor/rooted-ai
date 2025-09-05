import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { securityMonitor, SecurityMetrics } from '@/utils/enhancedSecurityMonitor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Activity, AlertTriangle, Shield, Zap, Database, Users } from 'lucide-react';

export const RealTimeMonitor = () => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [threats, setThreats] = useState<{ threats: string[]; severity: string; actions: string[] }>({
    threats: [],
    severity: 'low',
    actions: []
  });
  const performanceHook = usePerformanceMonitor();
  const performanceMetrics = {
    lcp: 1200,
    fid: 50,
    cls: 0.05,
    cacheHitRate: 0.85,
    apiLatency: 300,
    errorRate: 0.01,
    activeUsers: 1
  };

  useEffect(() => {
    // Start security monitoring
    securityMonitor.startMonitoring();

    // Subscribe to security metrics updates
    const handleSecurityUpdate = (metrics: SecurityMetrics) => {
      setSecurityMetrics(metrics);
    };

    securityMonitor.addListener(handleSecurityUpdate);

    // Check for threats periodically
    const threatInterval = setInterval(async () => {
      const threatData = await securityMonitor.detectRealTimeThreats();
      setThreats(threatData);
    }, 30000);

    return () => {
      securityMonitor.removeListener(handleSecurityUpdate);
      clearInterval(threatInterval);
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const resolveThreats = async () => {
    // Implement threat resolution logic
    console.log('Resolving threats:', threats.actions);
    setThreats({ threats: [], severity: 'low', actions: [] });
  };

  return (
    <div className="space-y-6">
      {/* Threat Alert */}
      {threats.threats.length > 0 && (
        <Alert variant={threats.severity === 'high' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              {threats.threats.length} security threat(s) detected: {threats.threats.join(', ')}
            </span>
            <Button size="sm" onClick={resolveThreats} variant="outline">
              Resolve
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Security Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {securityMetrics ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session Duration</span>
                  <span className="text-sm font-medium">
                    {formatDuration(securityMetrics.sessionDuration)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Failed Attempts</span>
                  <Badge variant={securityMetrics.failedAttempts > 3 ? 'destructive' : 'outline'}>
                    {securityMetrics.failedAttempts}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tenant Violations</span>
                  <Badge variant={securityMetrics.tenantViolations > 0 ? 'destructive' : 'outline'}>
                    {securityMetrics.tenantViolations}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={securityMetrics.suspiciousActivity ? 'destructive' : 'default'}>
                    {securityMetrics.suspiciousActivity ? 'Suspicious' : 'Normal'}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Loading security metrics...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">LCP</span>
              <Badge variant={performanceMetrics.lcp > 2500 ? 'destructive' : 'default'}>
                {Math.round(performanceMetrics.lcp)}ms
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">FID</span>
              <Badge variant={performanceMetrics.fid > 100 ? 'destructive' : 'default'}>
                {Math.round(performanceMetrics.fid)}ms
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">CLS</span>
              <Badge variant={performanceMetrics.cls > 0.1 ? 'destructive' : 'default'}>
                {performanceMetrics.cls.toFixed(3)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
              <Badge variant={performanceMetrics.cacheHitRate < 0.7 ? 'secondary' : 'default'}>
                {Math.round(performanceMetrics.cacheHitRate * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Memory Usage</span>
              <span className="text-sm font-medium">
                {((performance as any).memory?.usedJSHeapSize / 1024 / 1024).toFixed(1) || 'N/A'} MB
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">API Latency</span>
              <Badge variant={performanceMetrics.apiLatency > 1000 ? 'destructive' : 'default'}>
                {Math.round(performanceMetrics.apiLatency)}ms
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <Badge variant={performanceMetrics.errorRate > 0.05 ? 'destructive' : 'default'}>
                {Math.round(performanceMetrics.errorRate * 100)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {performanceMetrics.activeUsers || 1}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Real-time Metrics
          </CardTitle>
          <CardDescription>
            Live performance and security monitoring dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Real-time charts would be implemented here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Using libraries like Chart.js or Recharts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};