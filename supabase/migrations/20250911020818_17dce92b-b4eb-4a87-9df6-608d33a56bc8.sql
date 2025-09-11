-- Drop and recreate the policy_access_metrics view with proper security checks
DROP VIEW IF EXISTS public.policy_access_metrics;

CREATE VIEW public.policy_access_metrics 
WITH (security_barrier=true) 
AS 
SELECT 'announcement_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM announcement_companies ac
          WHERE user_is_company_member(ac.company_id)) AS accessible_rows
FROM announcement_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM announcement_companies LIMIT 1))

UNION ALL

 SELECT 'portal_resource_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM portal_resource_companies prc
          WHERE user_is_company_member(prc.company_id)) AS accessible_rows
FROM portal_resource_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM portal_resource_companies LIMIT 1))

UNION ALL

 SELECT 'useful_link_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM useful_link_companies ulc
          WHERE user_is_company_member(ulc.company_id)) AS accessible_rows
FROM useful_link_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM useful_link_companies LIMIT 1))

UNION ALL

 SELECT 'adoption_coaching_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM adoption_coaching_companies acc
          WHERE user_is_company_member(acc.company_id)) AS accessible_rows
FROM adoption_coaching_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM adoption_coaching_companies LIMIT 1))

UNION ALL

 SELECT 'report_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM report_companies rc
          WHERE user_is_company_member(rc.company_id)) AS accessible_rows
FROM report_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM report_companies LIMIT 1))

UNION ALL

 SELECT 'faq_companies'::text AS resource_type,
    count(*) AS total_rows,
    ( SELECT count(*) AS count
           FROM faq_companies fc
          WHERE user_is_company_member(fc.company_id)) AS accessible_rows
FROM faq_companies
WHERE is_admin() OR user_is_company_member((SELECT company_id FROM faq_companies LIMIT 1));

-- Grant access to the view
GRANT SELECT ON public.policy_access_metrics TO authenticated;

-- Add comment for security documentation
COMMENT ON VIEW public.policy_access_metrics IS 'Policy access metrics view with security barriers - only accessible to admins and relevant company members';