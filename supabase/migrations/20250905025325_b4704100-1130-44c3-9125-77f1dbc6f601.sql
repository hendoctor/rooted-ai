-- Fix linter error 0010: Set views to SECURITY INVOKER so they don't run with definer privileges
-- Applies to users_safe view

-- Ensure the view uses invoker's permissions and keep barrier for safety
ALTER VIEW public.users_safe SET (
  security_invoker = on,
  security_barrier = on
);
