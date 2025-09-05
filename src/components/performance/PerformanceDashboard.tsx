import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { enhancedCacheClient } from '@/lib/enhancedCacheClient';
import { CacheManager } from '@/lib/cacheManager';
import { Activity, Gauge, Database, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
}

interface CacheStats {
  local: { size: number; keys: string[] };
  unified: { size: number; userItems: number; expiredItems: number };
  activeRequests: number;
}

const PerformanceDashboard: React.FC = () => {
  const { getPerformanceSummary, sessionId } = usePerformanceMonitor();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Web Vitals thresholds (in milliseconds)
  const THRESHOLDS = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    loadTime: { good: 3000, poor: 5000 },
    ttfb: { good: 800, poor: 1800 }
  };

  // Determine metric status
  const getMetricStatus = (value: number, threshold: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  // Load performance data
  const loadPerformanceData = async () => {
    try {
      setIsRefreshing(true);
      
      // Get current performance summary
      const summary = await getPerformanceSummary();
      
      // Get cache statistics
      const cacheData = enhancedCacheClient.getStats();
      setCacheStats(cacheData);
      
      // Convert summary to metrics
      const performanceMetrics: PerformanceMetric[] = [];
      
      if (summary.coreWebVitals?.lcp) {
        performanceMetrics.push({
          name: 'Largest Contentful Paint',
          value: summary.coreWebVitals.lcp,
          unit: 'ms',
          status: getMetricStatus(summary.coreWebVitals.lcp, THRESHOLDS.lcp),
          threshold: THRESHOLDS.lcp
        });
      }
      
      if (summary.coreWebVitals?.fid) {
        performanceMetrics.push({
          name: 'First Input Delay',
          value: summary.coreWebVitals.fid,
          unit: 'ms',
          status: getMetricStatus(summary.coreWebVitals.fid, THRESHOLDS.fid),
          threshold: THRESHOLDS.fid
        });
      }
      
      if (summary.coreWebVitals?.cls) {
        performanceMetrics.push({
          name: 'Cumulative Layout Shift',
          value: summary.coreWebVitals.cls * 1000, // Convert to more readable number
          unit: '',
          status: getMetricStatus(summary.coreWebVitals.cls, THRESHOLDS.cls),
          threshold: { good: THRESHOLDS.cls.good * 1000, poor: THRESHOLDS.cls.poor * 1000 }
        });
      }
      
      if (summary.loadTime) {
        performanceMetrics.push({
          name: 'Page Load Time',
          value: summary.loadTime,
          unit: 'ms',
          status: getMetricStatus(summary.loadTime, THRESHOLDS.loadTime),
          threshold: THRESHOLDS.loadTime
        });
      }
      
      setMetrics(performanceMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadPerformanceData();
    
    const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Clear all caches
  const handleClearCaches = () => {
    CacheManager.clearAll();
    enhancedCacheClient.invalidate(/.*/);//pattern to match all keys
    loadPerformanceData();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor application performance and optimization metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={networkStatus === 'online' ? 'default' : 'destructive'}>
            <Wifi className="w-3 h-3 mr-1" />
            {networkStatus.toUpperCase()}
          </Badge>
          <Button 
            onClick={loadPerformanceData}
            disabled={isRefreshing}
            size="sm"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Core Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <div className={`p-1 rounded ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.value.toFixed(metric.name === 'Cumulative Layout Shift' ? 3 : 0)}
                    {metric.unit}
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={Math.min((metric.value / metric.threshold.poor) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: &lt;{metric.threshold.good}{metric.unit}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Session ID</p>
                  <p className="text-muted-foreground font-mono text-xs">{sessionId}</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-muted-foreground">{lastUpdated.toLocaleTimeString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cache Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  Cache Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cacheStats ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Local Cache</p>
                      <p className="text-2xl font-bold">{cacheStats.local.size}</p>
                      <p className="text-xs text-muted-foreground">entries</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Unified Cache</p>
                      <p className="text-2xl font-bold">{cacheStats.unified.size}</p>
                      <p className="text-xs text-muted-foreground">
                        {cacheStats.unified.userItems} user items, {cacheStats.unified.expiredItems} expired
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Requests</p>
                      <p className="text-2xl font-bold">{cacheStats.activeRequests}</p>
                      <p className="text-xs text-muted-foreground">in flight</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading cache statistics...</p>
                )}
              </CardContent>
            </Card>

            {/* Cache Management */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleClearCaches}
                  variant="outline"
                  className="w-full"
                >
                  Clear All Caches
                </Button>
                <div className="text-sm text-muted-foreground">
                  <p>This will clear all cached data and force fresh requests.</p>
                  <p className="mt-2">Use this if you're experiencing stale data issues.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals Explained</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: 'Largest Contentful Paint (LCP)',
                  description: 'Measures loading performance. Good LCP scores are 2.5s or less.',
                  icon: <Gauge className="w-5 h-5" />
                },
                {
                  name: 'First Input Delay (FID)', 
                  description: 'Measures interactivity. Good FID scores are 100ms or less.',
                  icon: <Activity className="w-5 h-5" />
                },
                {
                  name: 'Cumulative Layout Shift (CLS)',
                  description: 'Measures visual stability. Good CLS scores are 0.1 or less.',
                  icon: <AlertTriangle className="w-5 h-5" />
                }
              ].map((vital, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="text-primary mt-0.5">{vital.icon}</div>
                  <div>
                    <h4 className="font-medium">{vital.name}</h4>
                    <p className="text-sm text-muted-foreground">{vital.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Optimization Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {[
                  {
                    title: 'Enable Caching',
                    description: 'Our smart caching system reduces load times by up to 80%',
                    status: 'enabled'
                  },
                  {
                    title: 'Code Splitting',
                    description: 'Components are loaded on-demand to reduce initial bundle size',
                    status: 'enabled' 
                  },
                  {
                    title: 'Image Optimization',
                    description: 'Consider using WebP format and lazy loading for images',
                    status: 'recommended'
                  },
                  {
                    title: 'Prefetching',
                    description: 'Critical routes and data are prefetched for instant navigation',
                    status: 'enabled'
                  }
                ].map((tip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tip.title}</h4>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                    <Badge variant={tip.status === 'enabled' ? 'default' : 'secondary'}>
                      {tip.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;