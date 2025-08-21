-- Client portal widget tables for announcements, resources, useful links, coaching, reports & KPIs, and FAQs
-- Shared tables with company-specific content

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all announcements"
ON public.announcements FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company announcements"
ON public.announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = announcements.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Training & Resources
CREATE TABLE IF NOT EXISTS public.training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT,
  href TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all training_resources"
ON public.training_resources FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company training_resources"
ON public.training_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = training_resources.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Useful Links
CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all useful_links"
ON public.useful_links FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company useful_links"
ON public.useful_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = useful_links.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Adoption Coaching
CREATE TABLE IF NOT EXISTS public.adoption_coaching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  next_session TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.adoption_coaching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all adoption_coaching"
ON public.adoption_coaching FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company adoption_coaching"
ON public.adoption_coaching FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = adoption_coaching.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Reports & KPIs
CREATE TABLE IF NOT EXISTS public.reports_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reports_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reports_kpis"
ON public.reports_kpis FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company reports_kpis"
ON public.reports_kpis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = reports_kpis.company_id
      AND cm.user_id = auth.uid()
  )
);

-- FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all faqs"
ON public.faqs FOR ALL
USING (is_admin());

CREATE POLICY "Users can view company faqs"
ON public.faqs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm
    WHERE cm.company_id = faqs.company_id
      AND cm.user_id = auth.uid()
  )
);
