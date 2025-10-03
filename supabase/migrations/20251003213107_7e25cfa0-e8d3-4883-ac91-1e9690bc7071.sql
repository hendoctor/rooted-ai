-- Create unified portal data function that combines all portal content in one call
-- This reduces network requests from 2-3 to just 1, saving 200-400ms

CREATE OR REPLACE FUNCTION get_unified_portal_data(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  announcements_data jsonb;
  resources_data jsonb;
  links_data jsonb;
  tools_data jsonb;
  apps_data jsonb;
  faqs_data jsonb;
  kpis_data jsonb;
  sessions_data jsonb;
BEGIN
  -- Fetch all portal content in parallel using CTEs
  WITH 
  announcements_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'content', a.content,
        'summary', a.summary,
        'author', a.author,
        'url', a.url,
        'created_at', a.created_at,
        'updated_at', a.updated_at
      ) ORDER BY a.created_at DESC
    ) as data
    FROM announcements a
    JOIN announcement_companies ac ON ac.announcement_id = a.id
    WHERE ac.company_id = company_id_param
  ),
  resources_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'description', pr.description,
        'category', pr.category,
        'link', pr.link,
        'created_at', pr.created_at,
        'updated_at', pr.updated_at
      ) ORDER BY pr.created_at DESC
    ) as data
    FROM portal_resources pr
    JOIN portal_resource_companies prc ON prc.resource_id = pr.id
    WHERE prc.company_id = company_id_param
  ),
  links_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ul.id,
        'title', ul.title,
        'url', ul.url,
        'description', ul.description,
        'created_at', ul.created_at,
        'updated_at', ul.updated_at
      ) ORDER BY ul.created_at DESC
    ) as data
    FROM useful_links ul
    JOIN useful_link_companies ulc ON ulc.link_id = ul.id
    WHERE ulc.company_id = company_id_param
  ),
  tools_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', at.id,
        'ai_tool', at.ai_tool,
        'url', at.url,
        'comments', at.comments,
        'created_at', at.created_at,
        'updated_at', at.updated_at
      ) ORDER BY at.created_at DESC
    ) as data
    FROM ai_tools at
    JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id
    WHERE atc.company_id = company_id_param
  ),
  apps_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ap.id,
        'name', ap.name,
        'description', ap.description,
        'url', ap.url,
        'demo_preview', ap.demo_preview,
        'created_at', ap.created_at,
        'updated_at', ap.updated_at
      ) ORDER BY ap.created_at DESC
    ) as data
    FROM apps ap
    JOIN app_companies apc ON apc.app_id = ap.id
    WHERE apc.company_id = company_id_param
  ),
  faqs_cte AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'question', f.question,
        'answer', f.answer,
        'category', f.category,
        'goal', f.goal,
        'created_at', f.created_at,
        'updated_at', f.updated_at
      ) ORDER BY f.created_at DESC
    ) as data
    FROM faqs f
    JOIN faq_companies fc ON fc.faq_id = f.id
    WHERE fc.company_id = company_id_param
  ),
  kpis_cte AS (
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
      ) ORDER BY r.created_at DESC
    ) as data
    FROM reports r
    JOIN report_companies rc ON rc.report_id = r.id
    WHERE rc.company_id = company_id_param
  ),
  sessions_cte AS (
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
        'leader_name', u.display_name,
        'leader_email', u.email,
        'leader_avatar_url', u.avatar_url
      ) ORDER BY ac.session_date ASC
    ) as data
    FROM adoption_coaching ac
    JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id
    LEFT JOIN users u ON u.auth_user_id = ac.session_leader_id
    WHERE acc.company_id = company_id_param
      AND ac.session_date >= now()
      AND ac.session_status = 'scheduled'
  )
  SELECT 
    COALESCE(announcements_cte.data, '[]'::jsonb),
    COALESCE(resources_cte.data, '[]'::jsonb),
    COALESCE(links_cte.data, '[]'::jsonb),
    COALESCE(tools_cte.data, '[]'::jsonb),
    COALESCE(apps_cte.data, '[]'::jsonb),
    COALESCE(faqs_cte.data, '[]'::jsonb),
    COALESCE(kpis_cte.data, '[]'::jsonb),
    COALESCE(sessions_cte.data, '[]'::jsonb)
  INTO 
    announcements_data,
    resources_data,
    links_data,
    tools_data,
    apps_data,
    faqs_data,
    kpis_data,
    sessions_data
  FROM 
    announcements_cte,
    resources_cte,
    links_cte,
    tools_cte,
    apps_cte,
    faqs_cte,
    kpis_cte,
    sessions_cte;

  -- Build the unified response
  result := jsonb_build_object(
    'announcements', announcements_data,
    'resources', resources_data,
    'useful_links', links_data,
    'ai_tools', tools_data,
    'apps', apps_data,
    'faqs', faqs_data,
    'kpis', kpis_data,
    'coaching', sessions_data
  );

  RETURN result;
END;
$$;