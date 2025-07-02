-- Enable auth extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "auth" WITH SCHEMA "auth";

-- Create auth.config table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.config (
    parameter text PRIMARY KEY,
    value text
);

-- Insert basic auth configuration
INSERT INTO auth.config (parameter, value) VALUES 
    ('SITE_URL', 'https://ylewpehqfgltbhpkaout.supabase.co'),
    ('JWT_EXPIRY', '3600'),
    ('DISABLE_SIGNUP', 'false'),
    ('EMAIL_CONFIRM', 'false')
ON CONFLICT (parameter) DO NOTHING;