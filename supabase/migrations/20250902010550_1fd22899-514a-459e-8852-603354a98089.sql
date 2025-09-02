-- Fix the testy user setup by creating company first, then updating invitation and membership

-- Step 1: Create the Testy company if it doesn't exist
INSERT INTO companies (name, slug, settings, created_at, updated_at)
SELECT 'Testy', 'testy', '{}'::jsonb, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'testy');

-- Step 2: Update the invitation to accepted status with proper company_id
UPDATE user_invitations 
SET status = 'accepted', 
    accepted_at = now(),
    company_id = (SELECT id FROM companies WHERE slug = 'testy')
WHERE email = 'testy@hennahane.com' AND status = 'pending';

-- Step 3: Create/update the user record 
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

-- Step 4: Create the company membership
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