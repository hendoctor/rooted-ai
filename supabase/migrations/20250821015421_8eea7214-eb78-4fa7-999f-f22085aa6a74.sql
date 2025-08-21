-- 1) Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  title text NOT NULL,
  author text,
  summary text,
  content text,
  url text
);

CREATE TABLE IF NOT EXISTS public.announcement_companies (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, company_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin policies
CREATE POLICY "Admins manage announcements"
ON public.announcements FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage announcement assignments"
ON public.announcement_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Client read policy
CREATE POLICY "Clients read assigned announcements"
ON public.announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.announcement_companies ac
    JOIN public.company_memberships cm ON cm.company_id = ac.company_id
    WHERE ac.announcement_id = announcements.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_announcement_companies_company ON public.announcement_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_announcement_companies_announcement ON public.announcement_companies(announcement_id);

-- 2) Training & Resources
CREATE TABLE IF NOT EXISTS public.portal_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  title text NOT NULL,
  description text NOT NULL,
  link text,
  category text
);

CREATE TABLE IF NOT EXISTS public.portal_resource_companies (
  resource_id uuid NOT NULL REFERENCES public.portal_resources(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_id, company_id)
);

ALTER TABLE public.portal_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_resource_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_portal_resources_updated_at
BEFORE UPDATE ON public.portal_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage resources"
ON public.portal_resources FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage resource assignments"
ON public.portal_resource_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned resources"
ON public.portal_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.portal_resource_companies prc
    JOIN public.company_memberships cm ON cm.company_id = prc.company_id
    WHERE prc.resource_id = portal_resources.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_resource_companies_company ON public.portal_resource_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_resource_companies_resource ON public.portal_resource_companies(resource_id);

-- 3) Useful Links
CREATE TABLE IF NOT EXISTS public.useful_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  title text NOT NULL,
  url text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.useful_link_companies (
  link_id uuid NOT NULL REFERENCES public.useful_links(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, company_id)
);

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useful_link_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_useful_links_updated_at
BEFORE UPDATE ON public.useful_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage useful links"
ON public.useful_links FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage useful link assignments"
ON public.useful_link_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned useful links"
ON public.useful_links FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.useful_link_companies ulc
    JOIN public.company_memberships cm ON cm.company_id = ulc.company_id
    WHERE ulc.link_id = useful_links.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_useful_link_companies_company ON public.useful_link_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_useful_link_companies_link ON public.useful_link_companies(link_id);

-- 4) Adoption Coaching
CREATE TABLE IF NOT EXISTS public.adoption_coaching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  topic text NOT NULL,
  description text,
  media text,
  contact text,
  steps text
);

CREATE TABLE IF NOT EXISTS public.adoption_coaching_companies (
  coaching_id uuid NOT NULL REFERENCES public.adoption_coaching(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coaching_id, company_id)
);

ALTER TABLE public.adoption_coaching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_coaching_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_adoption_coaching_updated_at
BEFORE UPDATE ON public.adoption_coaching
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage adoption coaching"
ON public.adoption_coaching FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage adoption coaching assignments"
ON public.adoption_coaching_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned adoption coaching"
ON public.adoption_coaching FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.adoption_coaching_companies acc
    JOIN public.company_memberships cm ON cm.company_id = acc.company_id
    WHERE acc.coaching_id = adoption_coaching.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_adoption_coaching_companies_company ON public.adoption_coaching_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_adoption_coaching_companies_coaching ON public.adoption_coaching_companies(coaching_id);

-- 5) Reports & KPIs
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  name text NOT NULL,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  period text,
  link text,
  notes text
);

CREATE TABLE IF NOT EXISTS public.report_companies (
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, company_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage reports"
ON public.reports FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage report assignments"
ON public.report_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned reports"
ON public.reports FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.report_companies rc
    JOIN public.company_memberships cm ON cm.company_id = rc.company_id
    WHERE rc.report_id = reports.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_report_companies_company ON public.report_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_report_companies_report ON public.report_companies(report_id);

-- 6) FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  updated_by text,
  goal text
);

CREATE TABLE IF NOT EXISTS public.faq_companies (
  faq_id uuid NOT NULL REFERENCES public.faqs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (faq_id, company_id)
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER update_faqs_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage faqs"
ON public.faqs FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins manage faq assignments"
ON public.faq_companies FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned faqs"
ON public.faqs FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.faq_companies fc
    JOIN public.company_memberships cm ON cm.company_id = fc.company_id
    WHERE fc.faq_id = faqs.id
      AND cm.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_faq_companies_company ON public.faq_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_faq_companies_faq ON public.faq_companies(faq_id);
