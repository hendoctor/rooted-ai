-- Allow client users to read assignment tables for portal widgets
-- Announcements
CREATE POLICY IF NOT EXISTS "Clients read own announcement assignments"
ON public.announcement_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = announcement_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Training & Resources
CREATE POLICY IF NOT EXISTS "Clients read own resource assignments"
ON public.portal_resource_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = portal_resource_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Useful Links
CREATE POLICY IF NOT EXISTS "Clients read own useful link assignments"
ON public.useful_link_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = useful_link_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Adoption Coaching
CREATE POLICY IF NOT EXISTS "Clients read own coaching assignments"
ON public.adoption_coaching_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = adoption_coaching_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

-- Reports & KPIs
CREATE POLICY IF NOT EXISTS "Clients read own report assignments"
ON public.report_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = report_companies.company_id
      AND cm.user_id = auth.uid()
  )
);

-- FAQ
CREATE POLICY IF NOT EXISTS "Clients read own faq assignments"
ON public.faq_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id = faq_companies.company_id
      AND cm.user_id = auth.uid()
  )
);
