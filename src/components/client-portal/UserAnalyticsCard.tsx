import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Mail, Bell, BellOff, Users, TrendingUp, Calendar,
  ChevronDown, ChevronRight, Check, X, Search, Download,
  BarChart3, UserCheck, UserX, PieChart, RefreshCw
} from 'lucide-react';
import { useNewsletterSubscription, useCompanyNewsletterStats, useCompanyNewsletterDetails, NewsletterFrequency, NewsletterStatus } from '@/hooks/useNewsletterSubscription';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface UserAnalyticsCardProps {
  companyId?: string;
}

export const UserAnalyticsCard = ({ companyId }: UserAnalyticsCardProps) => {
  const { isAdminOfCompany } = usePermissions();
  const isCompanyAdmin = isAdminOfCompany(companyId);

  // Personal subscription data
  const {
    subscription,
    loading,
    updating,
    updateSubscription,
    refetch: refetchSubscription
  } = useNewsletterSubscription(companyId);
  const [tempFrequency, setTempFrequency] = useState<NewsletterFrequency>('weekly');

  // Company analytics data (only for admins)
  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats
  } = useCompanyNewsletterStats(companyId || '');
  const {
    details,
    loading: detailsLoading,
    refetch: refetchDetails
  } = useCompanyNewsletterDetails(companyId || '');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Personal subscription handlers
  const handleSubscriptionToggle = async (checked: boolean) => {
    if (!subscription) return;
    
    const newStatus: NewsletterStatus = checked ? 'active' : 'unsubscribed';
    const frequency = checked ? tempFrequency : subscription.frequency;
    
    await updateSubscription(newStatus, frequency);
  };

  const handleFrequencyChange = async (frequency: NewsletterFrequency) => {
    if (!subscription) return;
    
    setTempFrequency(frequency);
    
    if (subscription.status === 'active') {
      await updateSubscription('active', frequency);
    }
  };

  // Analytics data processing
  const filteredMembers = useMemo(() => {
    if (!details) return [];
    
    let filtered = details;
    
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (showSubscribedOnly) {
      filtered = filtered.filter(member => member.is_subscribed);
    }
    
    return filtered;
  }, [details, searchTerm, showSubscribedOnly]);

  const subscriptionRate = stats && stats.total_members > 0 
    ? Math.round((stats.subscribed_members / stats.total_members) * 100)
    : 0;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        refetchSubscription(),
        isCompanyAdmin ? refetchStats() : Promise.resolve(),
        isCompanyAdmin ? refetchDetails() : Promise.resolve()
      ]);
      toast.success('Analytics refreshed');
    } catch (error) {
      console.error('Error refreshing analytics data:', error);
      toast.error('Unable to refresh analytics right now.');
    } finally {
      setRefreshing(false);
    }
  };

  const exportMemberData = () => {
    if (!details) return;
    
    const csvContent = [
      ['Name', 'Email', 'Subscribed', 'Frequency'].join(','),
      ...details.map(member => [
        member.display_name,
        member.email,
        member.is_subscribed ? 'Yes' : 'No',
        member.is_subscribed ? member.newsletter_frequency : 'N/A'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company-newsletter-members.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSubscribed = subscription?.status === 'active';
  const currentFrequency = subscription?.frequency || 'weekly';

  if (loading && !isCompanyAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-forest-green">
              <BarChart3 className="h-5 w-5 text-forest-green" />
              User Analytics
            </CardTitle>
            <CardDescription>
              Manage your subscription and view company insights
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto bg-forest-green text-white hover:bg-forest-green/90"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isCompanyAdmin ? "analytics" : "subscription"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-forest-green/5 p-1 rounded-lg">
            <TabsTrigger
              value="subscription"
              className="flex items-center gap-2 text-sm text-forest-green data-[state=active]:bg-forest-green data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Mail className="h-4 w-4" />
              My Subscription
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              disabled={!isCompanyAdmin}
              className="flex items-center gap-2 text-sm text-forest-green data-[state=active]:bg-forest-green data-[state=active]:text-white data-[state=active]:shadow-sm disabled:text-muted-foreground"
            >
              <TrendingUp className="h-4 w-4" />
              Company Analytics
            </TabsTrigger>
          </TabsList>

          {/* Personal Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {isSubscribed ? (
                      <Bell className="h-5 w-5 text-forest-green" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <Label className="font-medium text-forest-green">
                        Newsletter Subscription
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isSubscribed ? `Active - ${currentFrequency}` : 'Not subscribed'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handleSubscriptionToggle}
                    disabled={updating}
                  />
                </div>

                {isSubscribed && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-forest-green">Newsletter Frequency</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Choose how often you'd like to receive updates
                      </p>
                    </div>
                    <RadioGroup
                      value={currentFrequency}
                      onValueChange={handleFrequencyChange}
                      disabled={updating}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-forest-green/10 transition-colors">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="cursor-pointer flex-1">
                          <div className="font-medium">Daily</div>
                          <div className="text-xs text-muted-foreground">Get updates every day</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-forest-green/10 transition-colors">
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly" className="cursor-pointer flex-1">
                          <div className="font-medium">Weekly</div>
                          <div className="text-xs text-muted-foreground">Get updates once a week</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-forest-green/10 transition-colors">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer flex-1">
                          <div className="font-medium">Monthly</div>
                          <div className="text-xs text-muted-foreground">Get updates once a month</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {updating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/20 p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating preferences...
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Company Analytics Tab (Admin only) */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {!isCompanyAdmin ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Company analytics are only available to company administrators.</p>
              </div>
            ) : statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Analytics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <Users className="h-6 w-6 mx-auto mb-2 text-forest-green" />
                    <div className="text-2xl font-bold text-forest-green">{stats.total_members}</div>
                    <div className="text-sm text-muted-foreground">Total Members</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <UserCheck className="h-6 w-6 mx-auto mb-2 text-forest-green" />
                    <div className="text-2xl font-bold text-forest-green">{stats.subscribed_members}</div>
                    <div className="text-sm text-muted-foreground">{subscriptionRate}% Subscribed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-forest-green" />
                    <div className="text-2xl font-bold text-forest-green">{stats.weekly_subscribers}</div>
                    <div className="text-sm text-muted-foreground">Weekly</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <PieChart className="h-6 w-6 mx-auto mb-2 text-forest-green" />
                    <div className="text-2xl font-bold text-forest-green">{stats.daily_subscribers}</div>
                    <div className="text-sm text-muted-foreground">Daily</div>
                  </div>
                </div>

                {/* Member Management Section */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-forest-green">Member Management</h3>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportMemberData}
                        className="flex items-center gap-2 border-forest-green text-forest-green hover:bg-forest-green/10 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubscribedOnly(!showSubscribedOnly)}
                      className={`flex items-center gap-2 border-forest-green transition-colors w-full lg:w-auto ${showSubscribedOnly ? 'bg-forest-green text-white hover:bg-forest-green/90' : 'text-forest-green hover:bg-forest-green/10'}`}
                    >
                      <UserCheck className="h-4 w-4" />
                      Subscribed Only
                    </Button>
                  </div>

                  {/* Member List */}
                  <Collapsible open={showAllMembers} onOpenChange={setShowAllMembers}>
                    <div className="space-y-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between border-forest-green text-forest-green hover:bg-forest-green/10">
                          <span>View All Members ({filteredMembers.length})</span>
                          {showAllMembers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2">
                        {detailsLoading ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 animate-pulse border rounded-lg">
                                <div className="h-10 w-10 bg-muted rounded-full"></div>
                                <div className="flex-1 space-y-1">
                                  <div className="h-4 bg-muted rounded w-3/4"></div>
                                  <div className="h-3 bg-muted rounded w-1/2"></div>
                                </div>
                                <div className="h-6 w-16 bg-muted rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredMembers.map((member) => (
                              <div key={member.user_id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-forest-green/10 transition-colors">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="text-sm">
                                    {getInitials(member.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{member.display_name}</div>
                                  <div className="text-sm text-muted-foreground truncate">{member.email}</div>
                                </div>
                                <Badge 
                                  variant={member.is_subscribed ? "default" : "outline"} 
                                  className="flex items-center gap-1"
                                >
                                  {member.is_subscribed ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      {member.newsletter_frequency}
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3 w-3" />
                                      unsubscribed
                                    </>
                                  )}
                                </Badge>
                              </div>
                            ))}
                            {filteredMembers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No members found matching your criteria.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  {/* Frequency Breakdown */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-forest-green">{stats.daily_subscribers}</div>
                        <div className="text-sm text-muted-foreground">Daily Subscribers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-forest-green">{stats.weekly_subscribers}</div>
                        <div className="text-sm text-muted-foreground">Weekly Subscribers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-forest-green">{stats.monthly_subscribers}</div>
                        <div className="text-sm text-muted-foreground">Monthly Subscribers</div>
                      </div>
                    </div>

                  {stats.unsubscribed_members > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Unsubscribed members:</span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <UserX className="h-3 w-3" />
                        {stats.unsubscribed_members}
                      </Badge>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analytics data available.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};