-- Add logo columns to companies table
ALTER TABLE public.companies 
ADD COLUMN logo_url text,
ADD COLUMN logo_filename text;

-- Create company-logos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);

-- RLS policies for company-logos bucket
CREATE POLICY "Company logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Company admins can upload their company logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-logos' 
  AND (
    -- Global admins can upload any company logo
    is_admin()
    OR 
    -- Company admins can upload their own company logo
    EXISTS (
      SELECT 1 FROM company_memberships cm 
      WHERE cm.user_id = auth.uid() 
      AND cm.role = 'Admin'
      AND cm.company_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company admins can update their company logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-logos' 
  AND (
    -- Global admins can update any company logo
    is_admin()
    OR 
    -- Company admins can update their own company logo
    EXISTS (
      SELECT 1 FROM company_memberships cm 
      WHERE cm.user_id = auth.uid() 
      AND cm.role = 'Admin'
      AND cm.company_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company admins can delete their company logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-logos' 
  AND (
    -- Global admins can delete any company logo
    is_admin()
    OR 
    -- Company admins can delete their own company logo
    EXISTS (
      SELECT 1 FROM company_memberships cm 
      WHERE cm.user_id = auth.uid() 
      AND cm.role = 'Admin'
      AND cm.company_id::text = (storage.foldername(name))[1]
    )
  )
);