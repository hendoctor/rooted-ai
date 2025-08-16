-- Clean up unused tables and optimize database
DROP TABLE IF EXISTS newsletter_subscriptions_auth CASCADE;
DROP TABLE IF EXISTS invitation_rate_limit CASCADE;

-- Drop redundant database functions
DROP FUNCTION IF EXISTS check_invitation_rate_limit(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_vapid_keys() CASCADE;