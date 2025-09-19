-- Fix column order mismatch in get_admin_portal_stats function
DROP FUNCTION IF EXISTS public.get_admin_portal_stats();

-- Recreate the function with correct column order
CREATE OR REPLACE FUNCTION public.get_admin_portal_stats()
RETURNS TABLE(company_id uuid, company_name text, company_slug text, user_count bigint, announcement_count bigint, resource_count bigint, useful_link_count bigint, ai_tool_count bigint, faq_count bigint, coaching_count bigint, kpi_count bigint, last_updated timestamp with time zone, logo_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this function
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH company_stats AS (
    SELECT 
      c.id as company_id,
      c.name as company_name,
      c.slug as company_slug,
      COALESCE(
        (SELECT COUNT(*) FROM company_memberships cm WHERE cm.company_id = c.id), 
        0
      ) as user_count,
      COALESCE(
        (SELECT COUNT(*) FROM announcement_companies ac WHERE ac.company_id = c.id), 
        0
      ) as announcement_count,
      COALESCE(
        (SELECT COUNT(*) FROM portal_resource_companies prc WHERE prc.company_id = c.id), 
        0
      ) as resource_count,
      COALESCE(
        (SELECT COUNT(*) FROM useful_link_companies ulc WHERE ulc.company_id = c.id), 
        0
      ) as useful_link_count,
      COALESCE(
        (SELECT COUNT(*) FROM ai_tool_companies atc WHERE atc.company_id = c.id), 
        0
      ) as ai_tool_count,
      COALESCE(
        (SELECT COUNT(*) FROM faq_companies fc WHERE fc.company_id = c.id), 
        0
      ) as faq_count,
      COALESCE(
        (SELECT COUNT(*) FROM adoption_coaching_companies acc WHERE acc.company_id = c.id), 
        0
      ) as coaching_count,
      COALESCE(
        (SELECT COUNT(*) FROM report_companies rc WHERE rc.company_id = c.id), 
        0
      ) as kpi_count,
      GREATEST(
        c.updated_at,
        COALESCE((SELECT MAX(a.updated_at) FROM announcements a JOIN announcement_companies ac ON ac.announcement_id = a.id WHERE ac.company_id = c.id), c.updated_at),
        COALESCE((SELECT MAX(pr.updated_at) FROM portal_resources pr JOIN portal_resource_companies prc ON prc.resource_id = pr.id WHERE prc.company_id = c.id), c.updated_at),
        COALESCE((SELECT MAX(ul.updated_at) FROM useful_links ul JOIN useful_link_companies ulc ON ulc.link_id = ul.id WHERE ulc.company_id = c.id), c.updated_at)
      ) as last_updated,
      c.logo_url
    FROM companies c
    ORDER BY c.name
  )
  SELECT * FROM company_stats;
END;
$function$