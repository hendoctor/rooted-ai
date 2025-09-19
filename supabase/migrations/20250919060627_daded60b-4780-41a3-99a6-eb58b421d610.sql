-- Create function to get comprehensive company portal content
CREATE OR REPLACE FUNCTION public.get_company_portal_content(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_result jsonb;
BEGIN
  -- Check if user has access to this company
  IF NOT (is_admin() OR is_company_member(p_company_id)) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  SELECT jsonb_build_object(
    'announcements', COALESCE(announcements_data.items, '[]'::jsonb),
    'resources', COALESCE(resources_data.items, '[]'::jsonb),
    'useful_links', COALESCE(links_data.items, '[]'::jsonb),
    'ai_tools', COALESCE(tools_data.items, '[]'::jsonb),
    'faqs', COALESCE(faqs_data.items, '[]'::jsonb),
    'coaching', COALESCE(coaching_data.items, '[]'::jsonb),
    'kpis', COALESCE(kpis_data.items, '[]'::jsonb)
  ) INTO content_result
  FROM (
    -- Announcements
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
      )
    ) as items
    FROM announcements a
    JOIN announcement_companies ac ON ac.announcement_id = a.id
    WHERE ac.company_id = p_company_id
  ) announcements_data
  CROSS JOIN (
    -- Resources
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'description', pr.description,
        'category', pr.category,
        'link', pr.link,
        'created_at', pr.created_at,
        'updated_at', pr.updated_at
      )
    ) as items
    FROM portal_resources pr
    JOIN portal_resource_companies prc ON prc.resource_id = pr.id
    WHERE prc.company_id = p_company_id
  ) resources_data
  CROSS JOIN (
    -- Useful Links
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ul.id,
        'title', ul.title,
        'description', ul.description,
        'url', ul.url,
        'created_at', ul.created_at,
        'updated_at', ul.updated_at
      )
    ) as items
    FROM useful_links ul
    JOIN useful_link_companies ulc ON ulc.link_id = ul.id
    WHERE ulc.company_id = p_company_id
  ) links_data
  CROSS JOIN (
    -- AI Tools
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', at.id,
        'ai_tool', at.ai_tool,
        'comments', at.comments,
        'url', at.url,
        'created_at', at.created_at,
        'updated_at', at.updated_at
      )
    ) as items
    FROM ai_tools at
    JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id
    WHERE atc.company_id = p_company_id
  ) tools_data
  CROSS JOIN (
    -- FAQs
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
    ) as items
    FROM faqs f
    JOIN faq_companies fc ON fc.faq_id = f.id
    WHERE fc.company_id = p_company_id
  ) faqs_data
  CROSS JOIN (
    -- Coaching (basic data, enhanced version comes from get_session_with_leader_info)
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
        'media', ac.media,
        'created_at', ac.created_at,
        'updated_at', ac.updated_at
      )
    ) as items
    FROM adoption_coaching ac
    JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id
    WHERE acc.company_id = p_company_id
    AND ac.session_date >= now()
    ORDER BY ac.session_date ASC
  ) coaching_data
  CROSS JOIN (
    -- KPIs/Reports
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'kpis', r.kpis,
        'period', r.period,
        'link', r.link,
        'notes', r.notes,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      )
    ) as items
    FROM reports r
    JOIN report_companies rc ON rc.report_id = r.id
    WHERE rc.company_id = p_company_id
  ) kpis_data;

  RETURN content_result;
END;
$function$;