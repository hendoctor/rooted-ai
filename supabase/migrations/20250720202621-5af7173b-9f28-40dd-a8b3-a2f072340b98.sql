-- Configure custom SMTP settings to use our auth-email webhook
-- This tells Supabase to use our custom email function instead of the default email provider

-- Enable the auth webhook for custom email sending
UPDATE auth.config 
SET email_template = jsonb_build_object(
  'invite', jsonb_build_object(
    'subject', 'Welcome to RootedAI - Verify Your Email',
    'content_path', 'confirmation'
  ),
  'confirmation', jsonb_build_object(
    'subject', 'Welcome to RootedAI - Verify Your Email', 
    'content_path', 'confirmation'
  ),
  'recovery', jsonb_build_object(
    'subject', 'Reset Your RootedAI Password',
    'content_path', 'recovery'
  ),
  'email_change', jsonb_build_object(
    'subject', 'Confirm Your Email Change - RootedAI',
    'content_path', 'email_change'
  )
) WHERE true;