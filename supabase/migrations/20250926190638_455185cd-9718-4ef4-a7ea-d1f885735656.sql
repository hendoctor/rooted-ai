-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_company_portal_content(uuid);
DROP FUNCTION IF EXISTS public.get_client_demo_portal_content();

-- Create the get_company_portal_content function with apps
CREATE OR REPLACE FUNCTION public.get_company_portal_content(company_id_param uuid)
RETURNS TABLE(
    announcements json,
    resources json,
    useful_links json,
    ai_tools json,
    apps json,
    faqs json,
    coaching json,
    kpis json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(
            (SELECT json_agg(a.*) FROM announcements a 
             JOIN announcement_companies ac ON ac.announcement_id = a.id 
             WHERE ac.company_id = company_id_param), 
            '[]'::json
        ) as announcements,
        
        COALESCE(
            (SELECT json_agg(r.*) FROM portal_resources r 
             JOIN portal_resource_companies prc ON prc.resource_id = r.id 
             WHERE prc.company_id = company_id_param), 
            '[]'::json
        ) as resources,
        
        COALESCE(
            (SELECT json_agg(u.*) FROM useful_links u 
             JOIN useful_link_companies ulc ON ulc.link_id = u.id 
             WHERE ulc.company_id = company_id_param), 
            '[]'::json
        ) as useful_links,
        
        COALESCE(
            (SELECT json_agg(at.*) FROM ai_tools at 
             JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id 
             WHERE atc.company_id = company_id_param), 
            '[]'::json
        ) as ai_tools,
        
        COALESCE(
            (SELECT json_agg(ap.*) FROM apps ap 
             JOIN app_companies apc ON apc.app_id = ap.id 
             WHERE apc.company_id = company_id_param), 
            '[]'::json
        ) as apps,
        
        COALESCE(
            (SELECT json_agg(f.*) FROM faqs f 
             JOIN faq_companies fc ON fc.faq_id = f.id 
             WHERE fc.company_id = company_id_param), 
            '[]'::json
        ) as faqs,
        
        COALESCE(
            (SELECT json_agg(ac.*) FROM adoption_coaching ac 
             JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id 
             WHERE acc.company_id = company_id_param), 
            '[]'::json
        ) as coaching,
        
        COALESCE(
            (SELECT json_agg(rp.*) FROM reports rp 
             JOIN report_companies rc ON rc.report_id = rp.id 
             WHERE rc.company_id = company_id_param), 
            '[]'::json
        ) as kpis;
END;
$$;

-- Create the get_client_demo_portal_content function with apps
CREATE OR REPLACE FUNCTION public.get_client_demo_portal_content()
RETURNS TABLE(
    announcements json,
    resources json,
    useful_links json,
    ai_tools json,
    apps json,
    faqs json,
    coaching json,
    kpis json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    demo_company_id uuid;
BEGIN
    -- Get the Client Demo company ID
    SELECT id INTO demo_company_id 
    FROM companies 
    WHERE slug = 'client-demo' 
    LIMIT 1;
    
    IF demo_company_id IS NULL THEN
        -- Return empty results if no demo company exists
        RETURN QUERY
        SELECT 
            '[]'::json as announcements,
            '[]'::json as resources,
            '[]'::json as useful_links,
            '[]'::json as ai_tools,
            '[]'::json as apps,
            '[]'::json as faqs,
            '[]'::json as coaching,
            '[]'::json as kpis;
    ELSE
        -- Return content assigned to the demo company + apps with demo_preview enabled
        RETURN QUERY
        SELECT 
            COALESCE(
                (SELECT json_agg(a.*) FROM announcements a 
                 JOIN announcement_companies ac ON ac.announcement_id = a.id 
                 WHERE ac.company_id = demo_company_id), 
                '[]'::json
            ) as announcements,
            
            COALESCE(
                (SELECT json_agg(r.*) FROM portal_resources r 
                 JOIN portal_resource_companies prc ON prc.resource_id = r.id 
                 WHERE prc.company_id = demo_company_id), 
                '[]'::json
            ) as resources,
            
            COALEQ(
                (SELECT json_agg(u.*) FROM useful_links u 
                 JOIN useful_link_companies ulc ON ulc.link_id = u.id 
                 WHERE ulc.company_id = demo_company_id), 
                '[]'::json
            ) as useful_links,
            
            COALESCE(
                (SELECT json_agg(at.*) FROM ai_tools at 
                 JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id 
                 WHERE atc.company_id = demo_company_id), 
                '[]'::json
            ) as ai_tools,
            
            COALESCE(
                (SELECT json_agg(ap.*) FROM apps ap 
                 JOIN app_companies apc ON apc.app_id = ap.id 
                 WHERE apc.company_id = demo_company_id AND ap.demo_preview = true), 
                '[]'::json
            ) as apps,
            
            COALESCE(
                (SELECT json_agg(f.*) FROM faqs f 
                 JOIN faq_companies fc ON fc.faq_id = f.id 
                 WHERE fc.company_id = demo_company_id), 
                '[]'::json
            ) as faqs,
            
            COALESCE(
                (SELECT json_agg(ac.*) FROM adoption_coaching ac 
                 JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id 
                 WHERE acc.company_id = demo_company_id), 
                '[]'::json
            ) as coaching,
            
            COALESCE(
                (SELECT json_agg(rp.*) FROM reports rp 
                 JOIN report_companies rc ON rc.report_id = rp.id 
                 WHERE rc.company_id = demo_company_id), 
                '[]'::json
            ) as kpis;
    END IF;
END;
$$;