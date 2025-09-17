import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, TrendingUp, Calendar, ChevronDown, ChevronRight, User, Check, X } from 'lucide-react';
import { useCompanyNewsletterStats, useCompanyNewsletterDetails } from '@/hooks/useNewsletterSubscription';

interface AdminNewsletterStatsProps {
  companyId: string;
}

export const AdminNewsletterStats = ({ companyId }: AdminNewsletterStatsProps) => {
  const { stats, loading } = useCompanyNewsletterStats(companyId);
  const { details, loading: detailsLoading } = useCompanyNewsletterDetails(companyId);
  const [showTotalMembers, setShowTotalMembers] = useState(false);
  const [showSubscribedMembers, setShowSubscribedMembers] = useState(false);

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

  const subscribedMembers = details.filter(member => member.is_subscribed);
  const unsubscribedMembers = details.filter(member => !member.is_subscribed);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

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
          <Collapsible open={showTotalMembers} onOpenChange={setShowTotalMembers}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Members</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats.total_members}</div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {showTotalMembers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="space-y-2 mt-3">
              {detailsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 animate-pulse">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {details.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-2 rounded border bg-card">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{member.display_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      </div>
                      <Badge variant={member.is_subscribed ? "default" : "outline"} className="text-xs">
                        {member.is_subscribed ? (
                          <div className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {member.newsletter_frequency}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <X className="h-3 w-3" />
                            unsubscribed
                          </div>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible open={showSubscribedMembers} onOpenChange={setShowSubscribedMembers}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Subscribed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-primary">
                  {stats.subscribed_members}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {subscriptionRate}%
                  </Badge>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {showSubscribedMembers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="space-y-2 mt-3">
              {detailsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 animate-pulse">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {subscribedMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-2 rounded border bg-card">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{member.display_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      </div>
                      <Badge variant="default" className="text-xs">
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {member.newsletter_frequency}
                        </div>
                      </Badge>
                    </div>
                  ))}
                  {subscribedMembers.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No subscribed members found
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
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