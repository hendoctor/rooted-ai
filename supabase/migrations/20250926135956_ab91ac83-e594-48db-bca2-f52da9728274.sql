-- Create RLS policies to allow public read access for "Client Demo" company content only
-- This enables the public demo experience while keeping all other data protected

-- Helper function to check if content belongs to Client Demo company
CREATE OR REPLACE FUNCTION public.is_client_demo_content(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id_param = (
    SELECT id FROM companies WHERE slug = 'client-demo' LIMIT 1
  );
$$;

-- Public read access for announcements assigned to Client Demo company
CREATE POLICY "Public can read Client Demo announcements"
ON announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM announcement_companies ac
    WHERE ac.announcement_id = announcements.id
    AND is_client_demo_content(ac.company_id)
  )
);

-- Public read access for resources assigned to Client Demo company
CREATE POLICY "Public can read Client Demo resources"
ON portal_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portal_resource_companies prc
    WHERE prc.resource_id = portal_resources.id
    AND is_client_demo_content(prc.company_id)
  )
);

-- Public read access for useful links assigned to Client Demo company
CREATE POLICY "Public can read Client Demo useful links"
ON useful_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM useful_link_companies ulc
    WHERE ulc.link_id = useful_links.id
    AND is_client_demo_content(ulc.company_id)
  )
);

-- Public read access for AI tools assigned to Client Demo company
CREATE POLICY "Public can read Client Demo AI tools"
ON ai_tools FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_tool_companies atc
    WHERE atc.ai_tool_id = ai_tools.id
    AND is_client_demo_content(atc.company_id)
  )
);

-- Public read access for FAQs assigned to Client Demo company
CREATE POLICY "Public can read Client Demo FAQs"
ON faqs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM faq_companies fc
    WHERE fc.faq_id = faqs.id
    AND is_client_demo_content(fc.company_id)
  )
);

-- Public read access for reports/KPIs assigned to Client Demo company
CREATE POLICY "Public can read Client Demo reports"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_companies rc
    WHERE rc.report_id = reports.id
    AND is_client_demo_content(rc.company_id)
  )
);

-- Public read access for coaching assigned to Client Demo company
CREATE POLICY "Public can read Client Demo coaching"
ON adoption_coaching FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM adoption_coaching_companies acc
    WHERE acc.coaching_id = adoption_coaching.id
    AND is_client_demo_content(acc.company_id)
  )
);

-- Public read access to the Client Demo company itself
CREATE POLICY "Public can read Client Demo company"
ON companies FOR SELECT
USING (slug = 'client-demo');

-- Create a public function to get Client Demo portal content
CREATE OR REPLACE FUNCTION public.get_client_demo_portal_content()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  demo_company_id uuid;
  result jsonb;
BEGIN
  -- Get Client Demo company ID
  SELECT id INTO demo_company_id 
  FROM companies 
  WHERE slug = 'client-demo' 
  LIMIT 1;
  
  IF demo_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Client Demo company not found',
      'announcements', '[]'::jsonb,
      'resources', '[]'::jsonb,
      'useful_links', '[]'::jsonb,
      'ai_tools', '[]'::jsonb,
      'faqs', '[]'::jsonb,
      'coaching', '[]'::jsonb,
      'kpis', '[]'::jsonb
    );
  END IF;
  
  -- Use existing function but for public access
  SELECT get_company_portal_content(demo_company_id) INTO result;
  
  RETURN result;
END;
$$;