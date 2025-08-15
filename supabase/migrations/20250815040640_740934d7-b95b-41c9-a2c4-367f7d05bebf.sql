-- Add unique constraint on auth_user_id to support upsert operations
ALTER TABLE public.users ADD CONSTRAINT unique_users_auth_user_id UNIQUE (auth_user_id);

-- Also make auth_user_id NOT NULL since it should always be present for valid users
ALTER TABLE public.users ALTER COLUMN auth_user_id SET NOT NULL;