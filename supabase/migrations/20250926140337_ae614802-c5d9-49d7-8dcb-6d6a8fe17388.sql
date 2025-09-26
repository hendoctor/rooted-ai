-- Fix the public function to get Client Demo portal content properly
DROP FUNCTION IF EXISTS public.get_client_demo_portal_content();

CREATE OR REPLACE FUNCTION public.get_client_demo_portal_content()
RETURNS TABLE(
  announcements jsonb,
  resources jsonb,
  useful_links jsonb,
  ai_tools jsonb,
  faqs jsonb,
  coaching jsonb,
  kpis jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  demo_company_id uuid;
BEGIN
  -- Get Client Demo company ID
  SELECT id INTO demo_company_id 
  FROM companies 
  WHERE slug = 'client-demo' 
  LIMIT 1;
  
  IF demo_company_id IS NULL THEN
    RETURN QUERY SELECT 
      '[]'::jsonb as announcements,
      '[]'::jsonb as resources,
      '[]'::jsonb as useful_links,
      '[]'::jsonb as ai_tools,
      '[]'::jsonb as faqs,
      '[]'::jsonb as coaching,
      '[]'::jsonb as kpis;
    RETURN;
  END IF;
  
  -- Return the content for Client Demo company using the existing function logic
  RETURN QUERY
  SELECT * FROM get_company_portal_content(demo_company_id);
END;
$$;