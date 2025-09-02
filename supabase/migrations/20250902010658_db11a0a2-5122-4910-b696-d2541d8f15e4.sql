-- Manually create the testy user membership and update invitation
-- This bypasses the sync trigger that's causing issues

-- Create the company membership directly
INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
SELECT 
  c.id,
  au.id,
  'Member',
  now(),
  now()
FROM companies c
CROSS JOIN auth.users au
WHERE c.slug = 'testy' 
  AND au.email = 'testy@hennahane.com'
  AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.company_id = c.id AND cm.user_id = au.id
  );

-- Update the invitation status
UPDATE user_invitations 
SET status = 'accepted', 
    accepted_at = now(),
    company_id = (SELECT id FROM companies WHERE slug = 'testy')
WHERE email = 'testy@hennahane.com' AND status = 'pending';