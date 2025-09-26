import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, CalendarRange, ExternalLink, StickyNote, Target } from 'lucide-react';

interface KPIEntry {
  name?: string;
  value?: string | number;
  target?: string | number;
}

interface KPIReport {
  id?: string;
  name?: string;
  period?: string;
  link?: string | null;
  notes?: string | null;
  kpis?: KPIEntry[] | string | null;
  created_at?: string;
  updated_at?: string;
}

interface PerformanceMetricCardProps {
  report: KPIReport;
}

const sanitizeNumericValue = (value: KPIEntry['value']) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]+/g, '');
    if (!normalized) {
      return Number.NaN;
    }
    return Number(normalized);
  }

  return Number.NaN;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const calculateProgress = (kpi: KPIEntry): number | null => {
  const valueNumber = sanitizeNumericValue(kpi.value);
  const targetNumber = sanitizeNumericValue(kpi.target);

  if (Number.isNaN(valueNumber) || Number.isNaN(targetNumber) || targetNumber <= 0) {
    return null;
  }

  return clamp((valueNumber / targetNumber) * 100, 0, 100);
};

const normalizeKpis = (rawKpis: KPIReport['kpis']): KPIEntry[] => {
  if (!rawKpis) {
    return [];
  }

  if (Array.isArray(rawKpis)) {
    return rawKpis as KPIEntry[];
  }

  if (typeof rawKpis === 'string') {
    try {
      const parsed = JSON.parse(rawKpis);
      return Array.isArray(parsed) ? (parsed as KPIEntry[]) : [];
    } catch (error) {
      console.error('Failed to parse KPI data:', error);
      return [];
    }
  }

  return [];
};

const normalizeLink = (link: KPIReport['link']) => {
  if (!link) {
    return null;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  return `https://${link}`;
};

const PerformanceMetricCard = ({ report }: PerformanceMetricCardProps) => {
  const kpis = useMemo(() => normalizeKpis(report?.kpis), [report?.kpis]);
  const summaryKpis = useMemo(
    () => kpis.filter(kpi => kpi?.name || kpi?.value).slice(0, 2),
    [kpis]
  );
  const moreCount = Math.max(kpis.length - summaryKpis.length, 0);
  const normalizedLink = useMemo(() => normalizeLink(report?.link ?? null), [report?.link]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group relative h-full cursor-pointer border-forest-green/30 bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-forest-green/60 hover:shadow-lg hover:shadow-forest-green/20 focus:outline-none focus:ring-2 focus:ring-forest-green/40">
          <CardHeader className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg font-semibold text-black">
                {report?.name || 'Performance Report'}
              </CardTitle>
              <Badge variant="outline" className="bg-forest-green/10 text-forest-green">
                {kpis.length} KPI{kpis.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <CardDescription>
              {report?.period ? `Period: ${report.period}` : 'Click to view detailed metrics'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaryKpis.length > 0 ? (
              <div className="space-y-3">
                {summaryKpis.map((kpi, index) => {
                  const progress = calculateProgress(kpi);
                  return (
                    <div key={`${kpi.name}-${index}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {kpi.name || `Metric ${index + 1}`}
                        </span>
                        <span className="font-semibold text-forest-green">
                          {kpi.value ?? '—'}
                          {kpi.target ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              / {kpi.target}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {progress !== null ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] uppercase text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-forest-green/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-forest-green to-sage"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] uppercase text-muted-foreground">Target not set</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No KPIs have been added to this report yet.
              </p>
            )}

            {moreCount > 0 && (
              <p className="text-xs text-muted-foreground">
                +{moreCount} more KPI{moreCount === 1 ? '' : 's'} configured
              </p>
            )}

            <div className="flex items-center gap-2 text-xs font-medium text-forest-green/80">
              <BarChart3 className="h-4 w-4" />
              <span>Open to see the full KPI breakdown</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 text-black">
            <span>{report?.name || 'Performance Report'}</span>
            <Badge variant="outline" className="bg-forest-green/10 text-forest-green">
              {kpis.length} KPI{kpis.length === 1 ? '' : 's'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {report?.period ? `Reporting period: ${report.period}` : 'Detailed performance metrics'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-forest-green/20 bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-forest-green" />
                Reporting Period
              </div>
              <p className="mt-2 text-base font-semibold text-forest-green">
                {report?.period || 'Not provided'}
              </p>
            </div>
            <div className="rounded-lg border border-forest-green/20 bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ExternalLink className="h-4 w-4 text-forest-green" />
                Report URL
              </div>
              <div className="mt-2">
                {normalizedLink ? (
                  <Button variant="outline" size="sm" asChild className="text-forest-green">
                    <a href={normalizedLink} target="_blank" rel="noopener noreferrer">
                      Open report
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">No URL provided</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border-l-4 border-forest-green bg-forest-green/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-forest-green">
              <StickyNote className="h-4 w-4" />
              Notes
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {report?.notes?.trim() ? report.notes : 'No notes provided for this report.'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-forest-green">
              <Target className="h-5 w-5" />
              KPI Progress
            </div>
            <div className="mt-4 space-y-4">
              {kpis.length > 0 ? (
                kpis.map((kpi, index) => {
                  const progress = calculateProgress(kpi);
                  return (
                    <div
                      key={`${kpi.name}-${index}`}
                      className="rounded-lg border border-forest-green/20 bg-background p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {kpi.name || `Metric ${index + 1}`}
                          </p>
                          <p className="text-2xl font-semibold text-forest-green">
                            {kpi.value ?? '—'}
                            {kpi.target ? (
                              <span className="ml-1 text-base text-muted-foreground">
                                / {kpi.target}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          {progress !== null ? (
                            <div>
                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                Progress
                              </p>
                              <p className="text-xl font-semibold text-forest-green">
                                {Math.round(progress)}%
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Target not set
                            </p>
                          )}
                        </div>
                      </div>
                      {progress !== null && (
                        <div className="mt-3 h-2 rounded-full bg-forest-green/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-forest-green to-sage"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No KPIs configured for this report yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceMetricCard;
