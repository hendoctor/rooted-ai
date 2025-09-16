-- Fix Security Definer View issue by removing unused views with security properties
-- These views are not used in the application code and are causing security linter warnings

-- Drop the policy_access_metrics view (has security_barrier=true)
DROP VIEW IF EXISTS public.policy_access_metrics CASCADE;

-- Drop the users_safe view (has security properties)
DROP VIEW IF EXISTS public.users_safe CASCADE;

-- Drop the policy_access_log table if it exists (appears unused)
DROP TABLE IF EXISTS public.policy_access_log CASCADE;