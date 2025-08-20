-- Add policy to allow company members to update company details
CREATE POLICY "Company members can update their company details" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM company_memberships cm 
    WHERE cm.company_id = companies.id 
    AND cm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM company_memberships cm 
    WHERE cm.company_id = companies.id 
    AND cm.user_id = auth.uid()
  )
);