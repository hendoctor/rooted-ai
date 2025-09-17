import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, TrendingUp, Calendar } from 'lucide-react';
import { useCompanyNewsletterStats } from '@/hooks/useNewsletterSubscription';

interface AdminNewsletterStatsProps {
  companyId: string;
}

export const AdminNewsletterStats = ({ companyId }: AdminNewsletterStatsProps) => {
  const { stats, loading } = useCompanyNewsletterStats(companyId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const subscriptionRate = stats.total_members > 0 
    ? Math.round((stats.subscribed_members / stats.total_members) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Newsletter Analytics
        </CardTitle>
        <CardDescription>
          Company newsletter subscription overview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Members</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_members}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Subscribed</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {stats.subscribed_members}
              <Badge variant="secondary" className="ml-2 text-xs">
                {subscriptionRate}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Frequency Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-orange-600">
                {stats.daily_subscribers}
              </div>
              <div className="text-xs text-muted-foreground">Daily</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-blue-600">
                {stats.weekly_subscribers}
              </div>
              <div className="text-xs text-muted-foreground">Weekly</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-green-600">
                {stats.monthly_subscribers}
              </div>
              <div className="text-xs text-muted-foreground">Monthly</div>
            </div>
          </div>
        </div>

        {stats.unsubscribed_members > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unsubscribed members:</span>
            <Badge variant="outline">{stats.unsubscribed_members}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};