import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type NewsletterFrequency = 'daily' | 'weekly' | 'monthly';
export type NewsletterStatus = 'active' | 'unsubscribed';

export interface NewsletterSubscription {
  id: string;
  email: string;
  status: NewsletterStatus;
  frequency: NewsletterFrequency;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsletterStats {
  total_members: number;
  subscribed_members: number;
  daily_subscribers: number;
  weekly_subscribers: number;
  monthly_subscribers: number;
  unsubscribed_members: number;
}

export interface NewsletterMemberDetail {
  user_id: string;
  email: string;
  display_name: string;
  newsletter_status: string;
  newsletter_frequency: string;
  is_subscribed: boolean;
}

export const useNewsletterSubscription = (companyId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<NewsletterSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchSubscription = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_user_newsletter_preferences', {
        p_user_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSubscription({
          ...data[0],
          status: data[0].status as NewsletterStatus,
          frequency: data[0].frequency as NewsletterFrequency
        });
      } else {
        // Create default subscription if none exists
        setSubscription({
          id: '',
          email: user.email || '',
          status: 'unsubscribed',
          frequency: 'weekly',
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching newsletter subscription:', error);
      toast({
        title: "Error",
        description: "Failed to load newsletter preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (
    status: NewsletterStatus,
    frequency: NewsletterFrequency
  ) => {
    if (!user?.id) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('update_newsletter_preferences', {
        p_user_id: user.id,
        p_email: user.email,
        p_status: status,
        p_frequency: frequency,
        p_company_id: companyId
      });

      if (error) throw error;

      const result = data as any;
      if (result && result.success) {
        setSubscription(prev => prev ? {
          ...prev,
          status,
          frequency,
          updated_at: new Date().toISOString()
        } : null);

        toast({
          title: "Success",
          description: status === 'active' 
            ? `Newsletter subscription updated to ${frequency}` 
            : "Successfully unsubscribed from newsletter"
        });
      } else {
        throw new Error(result?.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating newsletter subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update newsletter preferences",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user?.id, companyId]);

  return {
    subscription,
    loading,
    updating,
    updateSubscription,
    refetch: fetchSubscription
  };
};

export const useCompanyNewsletterStats = (companyId: string) => {
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase.rpc('get_company_newsletter_stats', {
        p_company_id: companyId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats({
          total_members: Number(data[0].total_members),
          subscribed_members: Number(data[0].subscribed_members),
          daily_subscribers: Number(data[0].daily_subscribers),
          weekly_subscribers: Number(data[0].weekly_subscribers),
          monthly_subscribers: Number(data[0].monthly_subscribers),
          unsubscribed_members: Number(data[0].unsubscribed_members)
        });
      }
    } catch (error) {
      console.error('Error fetching newsletter stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
};

export const useCompanyNewsletterDetails = (companyId: string) => {
  const [details, setDetails] = useState<NewsletterMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase.rpc('get_company_newsletter_details', {
        p_company_id: companyId
      });

      if (error) throw error;

      if (data) {
        setDetails(data.map((item: any) => ({
          user_id: item.user_id,
          email: item.email,
          display_name: item.display_name,
          newsletter_status: item.newsletter_status,
          newsletter_frequency: item.newsletter_frequency,
          is_subscribed: item.is_subscribed
        })));
      }
    } catch (error) {
      console.error('Error fetching newsletter details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [companyId]);

  return {
    details,
    loading,
    refetch: fetchDetails
  };
};