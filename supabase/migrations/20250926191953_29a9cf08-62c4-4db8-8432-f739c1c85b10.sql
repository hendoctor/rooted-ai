-- Fix typo in get_client_demo_portal_content function
DROP FUNCTION IF EXISTS public.get_client_demo_portal_content();

CREATE OR REPLACE FUNCTION public.get_client_demo_portal_content()
RETURNS TABLE(
  announcements jsonb,
  resources jsonb,
  useful_links jsonb,
  ai_tools jsonb,
  apps jsonb,
  faqs jsonb,
  coaching jsonb,
  kpis jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  client_demo_company_id uuid;
BEGIN
  -- Get the Client Demo company ID
  SELECT id INTO client_demo_company_id
  FROM companies
  WHERE slug = 'client-demo'
  LIMIT 1;

  -- If no Client Demo company exists, return empty data
  IF client_demo_company_id IS NULL THEN
    RETURN QUERY SELECT 
      '[]'::jsonb as announcements,
      '[]'::jsonb as resources,
      '[]'::jsonb as useful_links,
      '[]'::jsonb as ai_tools,
      '[]'::jsonb as apps,
      '[]'::jsonb as faqs,
      '[]'::jsonb as coaching,
      '[]'::jsonb as kpis;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    -- Announcements
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.title,
          'summary', a.summary,
          'content', a.content,
          'author', a.author,
          'url', a.url,
          'created_at', a.created_at,
          'updated_at', a.updated_at
        )
      )
      FROM announcements a
      JOIN announcement_companies ac ON ac.announcement_id = a.id
      WHERE ac.company_id = client_demo_company_id
    ), '[]'::jsonb) as announcements,

    -- Resources
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'title', pr.title,
          'description', pr.description,
          'link', pr.link,
          'category', pr.category,
          'created_at', pr.created_at,
          'updated_at', pr.updated_at
        )
      )
      FROM portal_resources pr
      JOIN portal_resource_companies prc ON prc.resource_id = pr.id
      WHERE prc.company_id = client_demo_company_id
    ), '[]'::jsonb) as resources,

    -- Useful Links - FIXED TYPO: COALESCE instead of COALEQ
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ul.id,
          'title', ul.title,
          'description', ul.description,
          'url', ul.url,
          'created_at', ul.created_at,
          'updated_at', ul.updated_at
        )
      )
      FROM useful_links ul
      JOIN useful_link_companies ulc ON ulc.link_id = ul.id
      WHERE ulc.company_id = client_demo_company_id
    ), '[]'::jsonb) as useful_links,

    -- AI Tools
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', at.id,
          'ai_tool', at.ai_tool,
          'comments', at.comments,
          'url', at.url,
          'created_at', at.created_at,
          'updated_at', at.updated_at
        )
      )
      FROM ai_tools at
      JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id
      WHERE atc.company_id = client_demo_company_id
    ), '[]'::jsonb) as ai_tools,

    -- Apps - only include those with demo_preview = true
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ap.id,
          'name', ap.name,
          'description', ap.description,
          'url', ap.url,
          'demo_preview', ap.demo_preview,
          'created_at', ap.created_at,
          'updated_at', ap.updated_at
        )
      )
      FROM apps ap
      JOIN app_companies apc ON apc.app_id = ap.id
      WHERE apc.company_id = client_demo_company_id
        AND ap.demo_preview = true
    ), '[]'::jsonb) as apps,

    -- FAQs
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'question', f.question,
          'answer', f.answer,
          'category', f.category,
          'goal', f.goal,
          'created_at', f.created_at,
          'updated_at', f.updated_at
        )
      )
      FROM faqs f
      JOIN faq_companies fc ON fc.faq_id = f.id
      WHERE fc.company_id = client_demo_company_id
    ), '[]'::jsonb) as faqs,

    -- Coaching
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ac.id,
          'topic', ac.topic,
          'description', ac.description,
          'session_date', ac.session_date,
          'session_duration', ac.session_duration,
          'session_status', ac.session_status,
          'meeting_link', ac.meeting_link,
          'session_notes', ac.session_notes,
          'steps', ac.steps,
          'media', ac.media,
          'contact', ac.contact,
          'created_at', ac.created_at,
          'updated_at', ac.updated_at
        )
      )
      FROM adoption_coaching ac
      JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id
      WHERE acc.company_id = client_demo_company_id
    ), '[]'::jsonb) as coaching,

    -- KPIs (Reports)
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'period', r.period,
          'kpis', r.kpis,
          'notes', r.notes,
          'link', r.link,
          'created_at', r.created_at,
          'updated_at', r.updated_at
        )
      )
      FROM reports r
      JOIN report_companies rc ON rc.report_id = r.id
      WHERE rc.company_id = client_demo_company_id
    ), '[]'::jsonb) as kpis;
END;
$function$;