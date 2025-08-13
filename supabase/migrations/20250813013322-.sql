-- Create newsletter_subscriptions_auth table for authenticated users
CREATE TABLE public.newsletter_subscriptions_auth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions_auth ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own subscription" 
ON public.newsletter_subscriptions_auth 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription" 
ON public.newsletter_subscriptions_auth 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.newsletter_subscriptions_auth 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription" 
ON public.newsletter_subscriptions_auth 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" 
ON public.newsletter_subscriptions_auth 
FOR SELECT 
USING (get_current_user_role() = 'Admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_newsletter_subscriptions_auth_updated_at
BEFORE UPDATE ON public.newsletter_subscriptions_auth
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time updates
ALTER TABLE public.newsletter_subscriptions_auth REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_subscriptions_auth;