-- Create the apps table
CREATE TABLE public.apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  demo_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create the app_companies junction table
CREATE TABLE public.app_companies (
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (app_id, company_id)
);

-- Enable RLS on both tables
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for apps table
CREATE POLICY "Admins manage apps" ON public.apps
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned apps" ON public.apps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.app_companies ac
      JOIN public.company_memberships cm ON cm.company_id = ac.company_id
      WHERE ac.app_id = apps.id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can read Client Demo apps" ON public.apps
  FOR SELECT USING (
    demo_preview = true AND 
    EXISTS (
      SELECT 1 FROM public.app_companies ac
      WHERE ac.app_id = apps.id AND is_client_demo_content(ac.company_id)
    )
  );

-- RLS Policies for app_companies table
CREATE POLICY "Admins manage app assignments" ON public.app_companies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Company members can read app assignments" ON public.app_companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = app_companies.company_id AND cm.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();