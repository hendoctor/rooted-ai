-- Fix SQL error in get_company_portal_content function
-- Remove ORDER BY clause from coaching subquery that's causing GROUP BY error

CREATE OR REPLACE FUNCTION public.get_company_portal_content(company_id_param uuid)
 RETURNS TABLE(announcements jsonb, resources jsonb, useful_links jsonb, ai_tools jsonb, faqs jsonb, coaching jsonb, kpis jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Announcements
    COALESCE(
      (SELECT jsonb_agg(
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
      ) FROM announcements a
      JOIN announcement_companies ac ON ac.announcement_id = a.id
      WHERE ac.company_id = company_id_param),
      '[]'::jsonb
    ) as announcements_data,
    
    -- Resources
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'title', pr.title,
          'description', pr.description,
          'link', pr.link,
          'category', pr.category,
          'created_at', pr.created_at,
          'updated_at', pr.updated_at
        )
      ) FROM portal_resources pr
      JOIN portal_resource_companies prc ON prc.resource_id = pr.id
      WHERE prc.company_id = company_id_param),
      '[]'::jsonb
    ) as resources_data,
    
    -- Useful Links
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ul.id,
          'title', ul.title,
          'description', ul.description,
          'url', ul.url,
          'created_at', ul.created_at,
          'updated_at', ul.updated_at
        )
      ) FROM useful_links ul
      JOIN useful_link_companies ulc ON ulc.link_id = ul.id
      WHERE ulc.company_id = company_id_param),
      '[]'::jsonb
    ) as useful_links_data,
    
    -- AI Tools
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', at.id,
          'ai_tool', at.ai_tool,
          'url', at.url,
          'comments', at.comments,
          'created_at', at.created_at,
          'updated_at', at.updated_at
        )
      ) FROM ai_tools at
      JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id
      WHERE atc.company_id = company_id_param),
      '[]'::jsonb
    ) as ai_tools_data,
    
    -- FAQs
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'question', f.question,
          'answer', f.answer,
          'category', f.category,
          'goal', f.goal,
          'created_at', f.created_at,
          'updated_at', f.updated_at
        )
      ) FROM faqs f
      JOIN faq_companies fc ON fc.faq_id = f.id
      WHERE fc.company_id = company_id_param),
      '[]'::jsonb
    ) as faqs_data,
    
    -- Coaching (removed problematic ORDER BY clause)
    COALESCE(
      (SELECT jsonb_agg(
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
          'contact', ac.contact,
          'media', ac.media,
          'session_leader_id', ac.session_leader_id,
          'created_at', ac.created_at,
          'updated_at', ac.updated_at
        )
      ) FROM adoption_coaching ac
      JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id
      WHERE acc.company_id = company_id_param),
      '[]'::jsonb
    ) as coaching_data,
    
    -- KPIs/Reports
    COALESCE(
      (SELECT jsonb_agg(
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
      ) FROM reports r
      JOIN report_companies rc ON rc.report_id = r.id
      WHERE rc.company_id = company_id_param),
      '[]'::jsonb
    ) as kpis_data;
END;
$function$;