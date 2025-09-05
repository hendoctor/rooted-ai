-- Create AI Tools table
CREATE TABLE public.ai_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_tool TEXT NOT NULL,
  url TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create AI Tools companies linking table
CREATE TABLE public.ai_tool_companies (
  ai_tool_id UUID NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (ai_tool_id, company_id)
);

-- Enable Row Level Security
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_tools
CREATE POLICY "Admins manage ai tools" 
ON public.ai_tools 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Clients read assigned ai tools" 
ON public.ai_tools 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM ai_tool_companies atc
  JOIN company_memberships cm ON cm.company_id = atc.company_id
  WHERE atc.ai_tool_id = ai_tools.id 
    AND cm.user_id = auth.uid()
));

-- RLS Policies for ai_tool_companies
CREATE POLICY "Admins manage ai tool assignments" 
ON public.ai_tool_companies 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Company members can read ai tool assignments" 
ON public.ai_tool_companies 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM company_memberships cm
  WHERE cm.company_id = ai_tool_companies.company_id 
    AND cm.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_ai_tools_updated_at
BEFORE UPDATE ON public.ai_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();