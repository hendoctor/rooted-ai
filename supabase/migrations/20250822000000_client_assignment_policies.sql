-- Allow client users to read widget assignment tables
CREATE POLICY IF NOT EXISTS "Clients read own announcement assignments"
ON public.announcement_companies FOR SELECT
USING (
  public.user_is_company_member(announcement_companies.company_id)
);

-- Training & Resources
CREATE POLICY IF NOT EXISTS "Clients read own resource assignments"
ON public.portal_resource_companies FOR SELECT
USING (
  public.user_is_company_member(portal_resource_companies.company_id)
);

-- Useful Links
CREATE POLICY IF NOT EXISTS "Clients read own useful link assignments"
ON public.useful_link_companies FOR SELECT
USING (
  public.user_is_company_member(useful_link_companies.company_id)
);

-- Adoption Coaching
CREATE POLICY IF NOT EXISTS "Clients read own coaching assignments"
ON public.adoption_coaching_companies FOR SELECT
USING (
  public.user_is_company_member(adoption_coaching_companies.company_id)
);

-- Reports & KPIs
CREATE POLICY IF NOT EXISTS "Clients read own report assignments"
ON public.report_companies FOR SELECT
USING (
  public.user_is_company_member(report_companies.company_id)
);

-- FAQ
CREATE POLICY IF NOT EXISTS "Clients read own faq assignments"
ON public.faq_companies FOR SELECT
USING (
  public.user_is_company_member(faq_companies.company_id)
);

-- Optimize company membership lookups
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company 
ON public.company_memberships (user_id, company_id);

-- Indexes for each resource-company table
CREATE INDEX IF NOT EXISTS idx_announcement_companies_company 
ON public.announcement_companies (company_id);

CREATE INDEX IF NOT EXISTS idx_portal_resource_companies_company 
ON public.portal_resource_companies (company_id);

CREATE INDEX IF NOT EXISTS idx_useful_link_companies_company 
ON public.useful_link_companies (company_id);

CREATE INDEX IF NOT EXISTS idx_adoption_coaching_companies_company 
ON public.adoption_coaching_companies (company_id);

CREATE INDEX IF NOT EXISTS idx_report_companies_company 
ON public.report_companies (company_id);

CREATE INDEX IF NOT EXISTS idx_faq_companies_company 
ON public.faq_companies (company_id);

-- Create a reusable function for company membership check
CREATE OR REPLACE FUNCTION public.user_is_company_member(
    check_company_id UUID
) 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.company_memberships cm
        WHERE cm.company_id = check_company_id 
          AND cm.user_id = auth.uid()
    );
$$;

-- Revoke execute permissions from public roles
REVOKE EXECUTE ON FUNCTION public.user_is_company_member(UUID) FROM PUBLIC;

-- Create a view to track policy performance and access patterns
CREATE OR REPLACE VIEW policy_access_metrics AS
SELECT 
    'announcement_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.announcement_companies ac 
     WHERE public.user_is_company_member(ac.company_id)) AS accessible_rows
UNION ALL
SELECT 
    'portal_resource_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.portal_resource_companies prc 
     WHERE public.user_is_company_member(prc.company_id)) AS accessible_rows
UNION ALL
SELECT 
    'useful_link_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.useful_link_companies ulc 
     WHERE public.user_is_company_member(ulc.company_id)) AS accessible_rows
UNION ALL
SELECT 
    'adoption_coaching_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.adoption_coaching_companies acc 
     WHERE public.user_is_company_member(acc.company_id)) AS accessible_rows
UNION ALL
SELECT 
    'report_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.report_companies rc 
     WHERE public.user_is_company_member(rc.company_id)) AS accessible_rows
UNION ALL
SELECT 
    'faq_companies' AS resource_type,
    COUNT(*) AS total_rows,
    (SELECT COUNT(*) FROM public.faq_companies fc 
     WHERE public.user_is_company_member(fc.company_id)) AS accessible_rows;

-- Audit log table for policy access
CREATE TABLE IF NOT EXISTS public.policy_access_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resource_type TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    company_id UUID NOT NULL,
    access_timestamp TIMESTAMPTZ DEFAULT NOW(),
    was_allowed BOOLEAN NOT NULL
);

-- Create an audit trigger function
CREATE OR REPLACE FUNCTION public.log_policy_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    INSERT INTO public.policy_access_log (
        resource_type, 
        user_id, 
        company_id, 
        was_allowed
    ) VALUES (
        TG_TABLE_NAME,
        auth.uid(),
        NEW.company_id,
        public.user_is_company_member(NEW.company_id)
    );
    RETURN NEW;
END;
$$;

-- Attach logging triggers to assignment tables
CREATE TRIGGER log_announcement_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.announcement_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();

CREATE TRIGGER log_portal_resource_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.portal_resource_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();

CREATE TRIGGER log_useful_link_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.useful_link_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();

CREATE TRIGGER log_adoption_coaching_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.adoption_coaching_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();

CREATE TRIGGER log_report_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.report_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();

CREATE TRIGGER log_faq_companies_access
AFTER INSERT OR UPDATE OR DELETE ON public.faq_companies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_access();