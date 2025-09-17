import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Mail, Bell, BellOff } from 'lucide-react';
import { useNewsletterSubscription, NewsletterFrequency, NewsletterStatus } from '@/hooks/useNewsletterSubscription';

interface NewsletterSubscriptionCardProps {
  companyId?: string;
}

export const NewsletterSubscriptionCard = ({ companyId }: NewsletterSubscriptionCardProps) => {
  const { subscription, loading, updating, updateSubscription } = useNewsletterSubscription(companyId);
  const [tempFrequency, setTempFrequency] = useState<NewsletterFrequency>('weekly');

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

  if (loading) {
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

  const isSubscribed = subscription?.status === 'active';
  const currentFrequency = subscription?.frequency || 'weekly';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-forest-green">
          <Mail className="h-5 w-5 text-forest-green" />
          Newsletter Subscription
        </CardTitle>
        <CardDescription>
          Manage your newsletter preferences and frequency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="newsletter-toggle" className="font-medium">
              {isSubscribed ? 'Subscribed' : 'Unsubscribed'}
            </Label>
          </div>
          <Switch
            id="newsletter-toggle"
            checked={isSubscribed}
            onCheckedChange={handleSubscriptionToggle}
            disabled={updating}
          />
        </div>

        {isSubscribed && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Newsletter Frequency</Label>
            <RadioGroup
              value={currentFrequency}
              onValueChange={handleFrequencyChange}
              disabled={updating}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="cursor-pointer">
                  Daily - Get updates every day
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="cursor-pointer">
                  Weekly - Get updates once a week
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="cursor-pointer">
                  Monthly - Get updates once a month
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {updating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating preferences...
          </div>
        )}
      </CardContent>
    </Card>
  );
};