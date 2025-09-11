-- Create activity logs table for tracking user authentication and activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_name TEXT,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity logs
CREATE POLICY "Admins can view all activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Admin'
  )
);

CREATE POLICY "System can log all activities" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_email ON public.activity_logs(user_email);

-- Create function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_user_email TEXT,
  p_company_id UUID DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_activity_type TEXT DEFAULT 'ACTIVITY',
  p_activity_description TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    company_id,
    company_name,
    activity_type,
    activity_description,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_user_email,
    p_company_id,
    p_company_name,
    p_activity_type,
    p_activity_description,
    p_ip_address,
    p_user_agent,
    p_metadata
  );
END;
$$;