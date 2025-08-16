-- Create the missing trigger for handling invitation signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_signup();

-- Ensure companies table has proper structure for B2B functionality
-- (This will only create if not exists due to the IF NOT EXISTS clause)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
    -- Table doesn't exist, create it
    CREATE TABLE public.companies (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Admins can manage all companies" 
    ON public.companies FOR ALL 
    USING (is_admin());

    CREATE POLICY "Users can view companies they're members of" 
    ON public.companies FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = companies.id 
      AND cm.user_id = auth.uid()
    ));
  END IF;
END
$$;

-- Ensure company_memberships table exists for B2B functionality
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_memberships' AND table_schema = 'public') THEN
    CREATE TABLE public.company_memberships (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'Member',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_by UUID REFERENCES auth.users(id),
      UNIQUE(company_id, user_id)
    );

    -- Enable RLS
    ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Admins can manage all memberships" 
    ON public.company_memberships FOR ALL 
    USING (is_admin());

    CREATE POLICY "Users can view their own memberships" 
    ON public.company_memberships FOR SELECT 
    USING (user_id = auth.uid());

    CREATE POLICY "Admins can view all memberships" 
    ON public.company_memberships FOR SELECT 
    USING (is_admin());
  END IF;
END
$$;

-- Update the invitation table to include company association if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_invitations' AND column_name = 'company_id' AND table_schema = 'public') THEN
    ALTER TABLE public.user_invitations ADD COLUMN company_id UUID REFERENCES public.companies(id);
  END IF;
END
$$;

-- Update the handle_invitation_signup function to also create company membership
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a new auth user is created, check for pending invitation
  UPDATE user_invitations 
  SET 
    status = 'accepted',
    accepted_at = now()
  WHERE 
    lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now();
  
  -- Create user record with role, client_name, and display_name from invitation
  INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
  SELECT NEW.id, NEW.email, ui.role, ui.client_name, ui.full_name, now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute')
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    client_name = EXCLUDED.client_name,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  
  -- Create company membership if invitation has a company_id
  INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
  SELECT ui.company_id, NEW.id, 'Member', now(), now()
  FROM user_invitations ui
  WHERE lower(ui.email) = lower(NEW.email)
    AND ui.status = 'accepted'
    AND ui.accepted_at >= (now() - interval '1 minute')
    AND ui.company_id IS NOT NULL
  ORDER BY ui.accepted_at DESC
  LIMIT 1
  ON CONFLICT (company_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;