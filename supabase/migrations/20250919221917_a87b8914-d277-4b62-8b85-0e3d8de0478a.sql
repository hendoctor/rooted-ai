-- Create table for storing admin table view configurations
CREATE TABLE public.admin_table_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  view_name text NOT NULL,
  content_type text NOT NULL,
  column_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, view_name)
);

-- Enable RLS
ALTER TABLE public.admin_table_views ENABLE ROW LEVEL SECURITY;

-- Create policies for admin table views
CREATE POLICY "Admins can manage their own table views"
ON public.admin_table_views
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Admin'
  )
)
WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Admin'
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_admin_table_views_updated_at
  BEFORE UPDATE ON public.admin_table_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();