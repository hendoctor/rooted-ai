import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type NewsletterSubscription = Database['public']['Tables']['newsletter_subscriptions_auth']['Row'];

export const useNewsletterSubscription = () => {
  const [subscription, setSubscription] = useState<NewsletterSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('newsletter_subscriptions_auth')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const subscribe = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscriptions_auth')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          subscribed: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user || !subscription) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscriptions_auth')
        .update({ subscribed: false })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      toast({
        title: "Successfully unsubscribed",
        description: "You've been unsubscribed from our newsletter.",
      });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Unsubscribe failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  // Set up real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('newsletter-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'newsletter_subscriptions_auth',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as NewsletterSubscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    subscription,
    loading,
    subscribe,
    unsubscribe,
    isSubscribed: subscription?.subscribed || false,
  };
};