-- Add indexes for better performance on assignment tables
CREATE INDEX IF NOT EXISTS idx_announcement_companies_company_id ON announcement_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_resource_companies_company_id ON portal_resource_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_useful_link_companies_company_id ON useful_link_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_companies_company_id ON ai_tool_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_faq_companies_company_id ON faq_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_adoption_coaching_companies_company_id ON adoption_coaching_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_report_companies_company_id ON report_companies(company_id);

-- Create optimized RPC function to fetch all portal content in one call
CREATE OR REPLACE FUNCTION public.get_company_portal_content(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Check if user has access to this company
  IF NOT user_is_company_member(p_company_id) AND NOT is_admin() THEN
    RETURN jsonb_build_object(
      'error', 'Access denied',
      'announcements', '[]'::jsonb,
      'resources', '[]'::jsonb,
      'useful_links', '[]'::jsonb,
      'ai_tools', '[]'::jsonb,
      'faqs', '[]'::jsonb,
      'coaching', '[]'::jsonb,
      'kpis', '[]'::jsonb
    );
  END IF;

  -- Fetch all content in a single query
  WITH portal_data AS (
    -- Announcements
    SELECT 
      'announcements' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.title,
          'content', a.content,
          'summary', a.summary,
          'author', a.author,
          'url', a.url,
          'created_at', a.created_at
        )
      ) as content
    FROM announcements a
    JOIN announcement_companies ac ON ac.announcement_id = a.id
    WHERE ac.company_id = p_company_id
    
    UNION ALL
    
    -- Resources
    SELECT 
      'resources' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'description', r.description,
          'link', r.link,
          'category', r.category,
          'created_at', r.created_at
        )
      ) as content
    FROM portal_resources r
    JOIN portal_resource_companies prc ON prc.resource_id = r.id
    WHERE prc.company_id = p_company_id
    
    UNION ALL
    
    -- Useful Links
    SELECT 
      'useful_links' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', ul.id,
          'title', ul.title,
          'description', ul.description,
          'url', ul.url,
          'created_at', ul.created_at
        )
      ) as content
    FROM useful_links ul
    JOIN useful_link_companies ulc ON ulc.link_id = ul.id
    WHERE ulc.company_id = p_company_id
    
    UNION ALL
    
    -- AI Tools
    SELECT 
      'ai_tools' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', at.id,
          'ai_tool', at.ai_tool,
          'url', at.url,
          'comments', at.comments,
          'created_at', at.created_at
        )
      ) as content
    FROM ai_tools at
    JOIN ai_tool_companies atc ON atc.ai_tool_id = at.id
    WHERE atc.company_id = p_company_id
    
    UNION ALL
    
    -- FAQs
    SELECT 
      'faqs' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'question', f.question,
          'answer', f.answer,
          'category', f.category,
          'goal', f.goal,
          'created_at', f.created_at
        )
      ) as content
    FROM faqs f
    JOIN faq_companies fc ON fc.faq_id = f.id
    WHERE fc.company_id = p_company_id
    
    UNION ALL
    
    -- Coaching
    SELECT 
      'coaching' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'topic', c.topic,
          'description', c.description,
          'steps', c.steps,
          'contact', c.contact,
          'media', c.media,
          'created_at', c.created_at
        )
      ) as content
    FROM adoption_coaching c
    JOIN adoption_coaching_companies acc ON acc.coaching_id = c.id
    WHERE acc.company_id = p_company_id
    
    UNION ALL
    
    -- Reports/KPIs
    SELECT 
      'kpis' as content_type,
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'period', r.period,
          'kpis', r.kpis,
          'link', r.link,
          'notes', r.notes,
          'created_at', r.created_at
        )
      ) as content
    FROM reports r
    JOIN report_companies rc ON rc.report_id = r.id
    WHERE rc.company_id = p_company_id
  )
  SELECT jsonb_object_agg(
    content_type,
    COALESCE(content, '[]'::jsonb)
  ) INTO result
  FROM portal_data;

  -- Ensure all expected keys exist
  result := jsonb_build_object(
    'announcements', COALESCE(result->'announcements', '[]'::jsonb),
    'resources', COALESCE(result->'resources', '[]'::jsonb),
    'useful_links', COALESCE(result->'useful_links', '[]'::jsonb),
    'ai_tools', COALESCE(result->'ai_tools', '[]'::jsonb),
    'faqs', COALESCE(result->'faqs', '[]'::jsonb),
    'coaching', COALESCE(result->'coaching', '[]'::jsonb),
    'kpis', COALESCE(result->'kpis', '[]'::jsonb)
  );

  RETURN result;
END;
$function$;