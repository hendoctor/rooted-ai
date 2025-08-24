-- Read-only visibility for company members on mapping tables used by Client Portal
-- Ensures authenticated client users can see content assigned to their company

-- 1) Enable RLS on mapping tables (safe if already enabled)
ALTER TABLE public.announcement_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_resource_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useful_link_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_coaching_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_companies ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing policies with same names to avoid duplicates (idempotent)
DROP POLICY IF EXISTS "Company members can read announcement assignments" ON public.announcement_companies;
DROP POLICY IF EXISTS "Company members can read resource assignments" ON public.portal_resource_companies;
DROP POLICY IF EXISTS "Company members can read useful link assignments" ON public.useful_link_companies;
DROP POLICY IF EXISTS "Company members can read adoption coaching assignments" ON public.adoption_coaching_companies;
DROP POLICY IF EXISTS "Company members can read report assignments" ON public.report_companies;
DROP POLICY IF EXISTS "Company members can read FAQ assignments" ON public.faq_companies;

-- 3) Create read-only SELECT policies scoped by company membership
CREATE POLICY "Company members can read announcement assignments"
ON public.announcement_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = announcement_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can read resource assignments"
ON public.portal_resource_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = portal_resource_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can read useful link assignments"
ON public.useful_link_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = useful_link_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can read adoption coaching assignments"
ON public.adoption_coaching_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = adoption_coaching_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can read report assignments"
ON public.report_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = report_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can read FAQ assignments"
ON public.faq_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = faq_companies.company_id
      AND cm.user_id = auth.uid()
  )
);
