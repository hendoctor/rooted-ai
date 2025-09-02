-- Fix the invitation acceptance process to ensure company creation and membership
-- First, let's manually fix the testy user situation

-- Update the invitation to accepted status
UPDATE user_invitations 
SET status = 'accepted', 
    accepted_at = now(),
    company_id = (
      SELECT id FROM companies WHERE slug = 'testy' 
      UNION ALL 
      SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'testy')
      LIMIT 1
    )
WHERE email = 'testy@hennahane.com' AND status = 'pending';

-- Create the Testy company if it doesn't exist
INSERT INTO companies (name, slug, settings)
SELECT 'Testy', 'testy', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'testy');

-- Get the testy user's auth_user_id
-- Create/update the user record 
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

-- Create the company membership
INSERT INTO company_memberships (company_id, user_id, role, created_at, updated_at)
SELECT 
  c.id,
  au.id,
  'Member',
  now(),
  now()
FROM companies c, auth.users au
WHERE c.slug = 'testy' 
  AND au.email = 'testy@hennahane.com'
ON CONFLICT (company_id, user_id) DO NOTHING;