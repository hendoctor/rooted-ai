import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';

interface PerformanceBudget {
  metric: string;
  budget: number;
  current: number;
  status: 'pass' | 'warn' | 'fail';
  trend: 'up' | 'down' | 'stable';
}

interface BuildMetrics {
  bundleSize: number;
  buildTime: number;
  chunkCount: number;
  cacheHitRate: number;
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

export const ProductionDashboard = () => {
  const [budgets, setBudgets] = useState<PerformanceBudget[]>([]);
  const [buildMetrics, setBuildMetrics] = useState<BuildMetrics | null>(null);
  const [lastDeployment, setLastDeployment] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock performance budgets
  useEffect(() => {
    const mockBudgets: PerformanceBudget[] = [
      {
        metric: 'First Contentful Paint',
        budget: 1500,
        current: 1200,
        status: 'pass',
        trend: 'down'
      },
      {
        metric: 'Largest Contentful Paint',
        budget: 2500,
        current: 2100,
        status: 'pass',
        trend: 'stable'
      },
      {
        metric: 'Cumulative Layout Shift',
        budget: 0.1,
        current: 0.05,
        status: 'pass',
        trend: 'down'
      },
      {
        metric: 'Bundle Size (gzipped)',
        budget: 250000,
        current: 220000,
        status: 'pass',
        trend: 'down'
      },
      {
        metric: 'Time to Interactive',
        budget: 3500,
        current: 2800,
        status: 'pass',
        trend: 'down'
      },
      {
        metric: 'Build Time',
        budget: 120000,
        current: 95000,
        status: 'pass',
        trend: 'down'
      }
    ];
    setBudgets(mockBudgets);

    const mockBuildMetrics: BuildMetrics = {
      bundleSize: 220000,
      buildTime: 95000,
      chunkCount: 12,
      cacheHitRate: 0.87,
      lighthouse: {
        performance: 95,
        accessibility: 98,
        bestPractices: 92,
        seo: 100
      }
    };
    setBuildMetrics(mockBuildMetrics);

    setLastDeployment(new Date(Date.now() - 3600000)); // 1 hour ago
  }, []);

  const runPerformanceAudit = async () => {
    setLoading(true);
    
    // Simulate performance audit
    setTimeout(() => {
      console.log('Performance audit completed');
      setLoading(false);
    }, 3000);
  };

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      budgets,
      buildMetrics,
      recommendations: getRecommendations()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    budgets.forEach(budget => {
      if (budget.status === 'warn' || budget.status === 'fail') {
        recommendations.push(`Optimize ${budget.metric}: current ${budget.current} exceeds budget ${budget.budget}`);
      }
    });

    if (buildMetrics) {
      if (buildMetrics.chunkCount > 15) {
        recommendations.push('Consider reducing the number of chunks for better caching');
      }
      if (buildMetrics.cacheHitRate < 0.8) {
        recommendations.push('Improve cache hit rate by optimizing chunk splitting');
      }
    }

    return recommendations;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'default';
      case 'warn': return 'secondary';
      case 'fail': return 'destructive';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor performance budgets and build metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={runPerformanceAudit} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Audit
          </Button>
        </div>
      </div>

      {/* Deployment Status */}
      {lastDeployment && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Last deployment: {lastDeployment.toLocaleString()} 
            {' '}({Math.round((Date.now() - lastDeployment.getTime()) / 60000)} minutes ago)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Budgets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.map((budget, index) => (
                <div key={budget.metric}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{budget.metric}</span>
                      {getTrendIcon(budget.trend)}
                    </div>
                    <Badge variant={getStatusColor(budget.status)}>
                      {budget.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Current: {budget.metric.includes('Size') ? formatBytes(budget.current) : formatTime(budget.current)}
                    </span>
                    <span>
                      Budget: {budget.metric.includes('Size') ? formatBytes(budget.budget) : formatTime(budget.budget)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-secondary rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        budget.status === 'pass' ? 'bg-green-500' :
                        budget.status === 'warn' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((budget.current / budget.budget) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {index < budgets.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Build Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Build Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {buildMetrics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold">{formatBytes(buildMetrics.bundleSize)}</div>
                    <div className="text-xs text-muted-foreground">Bundle Size</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold">{formatTime(buildMetrics.buildTime)}</div>
                    <div className="text-xs text-muted-foreground">Build Time</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold">{buildMetrics.chunkCount}</div>
                    <div className="text-xs text-muted-foreground">Chunks</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold">{Math.round(buildMetrics.cacheHitRate * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Cache Hit Rate</div>
                  </div>
                </div>

                <Separator />

                {/* Lighthouse Scores */}
                <div>
                  <h4 className="font-medium mb-3">Lighthouse Scores</h4>
                  <div className="space-y-2">
                    {Object.entries(buildMetrics.lighthouse).map(([key, score]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{score}</span>
                          <div className="w-16 bg-secondary rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                score >= 90 ? 'bg-green-500' :
                                score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {getRecommendations().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getRecommendations().map((recommendation, index) => (
                <Alert key={index}>
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};