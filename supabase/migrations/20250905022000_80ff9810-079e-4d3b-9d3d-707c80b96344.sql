-- Fix AI Tools 400 errors by establishing relationships for PostgREST embedding
-- Adds FK constraints and a composite primary key for ai_tool_companies

DO $$ BEGIN
  -- Foreign key: ai_tool_companies.ai_tool_id -> ai_tools.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_tool_companies_ai_tool_id_fkey'
  ) THEN
    ALTER TABLE public.ai_tool_companies
    ADD CONSTRAINT ai_tool_companies_ai_tool_id_fkey
    FOREIGN KEY (ai_tool_id)
    REFERENCES public.ai_tools(id)
    ON DELETE CASCADE;
  END IF;

  -- Foreign key: ai_tool_companies.company_id -> companies.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_tool_companies_company_id_fkey'
  ) THEN
    ALTER TABLE public.ai_tool_companies
    ADD CONSTRAINT ai_tool_companies_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE;
  END IF;

  -- Composite primary key to prevent duplicates and aid embedding
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_tool_companies_pkey'
  ) THEN
    ALTER TABLE public.ai_tool_companies
    ADD CONSTRAINT ai_tool_companies_pkey PRIMARY KEY (ai_tool_id, company_id);
  END IF;
END $$;