-- Add avatar_filename column to users table to track actual filenames
ALTER TABLE public.users 
ADD COLUMN avatar_filename text;