-- Simple approach: Just create the missing profile directly for jasmine@hennahane.com
-- without complex triggers that conflict

-- Get jasmine's data and create profile
INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
SELECT 
    u.auth_user_id,
    u.email,
    'Jasmine Hennahane',
    now(),
    now()
FROM public.users u
WHERE u.email = 'jasmine@hennahane.com'
  AND u.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = u.auth_user_id
  );

-- Also update the user record to ensure auth_user_id is correctly set
UPDATE public.users 
SET auth_user_id = (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = public.users.email
),
updated_at = now()
WHERE email = 'jasmine@hennahane.com' 
  AND auth_user_id IS NULL;