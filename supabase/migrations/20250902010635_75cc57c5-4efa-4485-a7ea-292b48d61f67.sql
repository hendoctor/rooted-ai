-- Update user record and create membership for testy user
-- First ensure the user record exists
INSERT INTO users (auth_user_id, email, role, client_name, display_name, created_at, updated_at)
SELECT 
  au.id,
  'testy@hennahane.com',
  'Client',
  'Testy',
  'Testy User',
  now(),
  now()
FROM auth.users au
WHERE au.email = 'testy@hennahane.com'
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = 'Client',
  client_name = 'Testy',
  display_name = 'Testy User',
  updated_at = now();

-- Create company membership
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
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Finally update the invitation status
UPDATE user_invitations 
SET status = 'accepted', 
    accepted_at = now(),
    company_id = (SELECT id FROM companies WHERE slug = 'testy')
WHERE email = 'testy@hennahane.com';