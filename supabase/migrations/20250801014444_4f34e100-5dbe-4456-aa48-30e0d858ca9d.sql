-- Fix ALL functions to have proper search_path set
-- This is critical for security to prevent search_path manipulation attacks

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_notification_settings_updated_at function  
CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix generate_vapid_keys function
CREATE OR REPLACE FUNCTION public.generate_vapid_keys()
RETURNS TABLE(public_key text, private_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- This is a placeholder - VAPID keys should be generated externally
  -- For now, return the standard format that applications expect
  RETURN QUERY SELECT 
    'BJ8VdLF5YpH8S-PQ5J8rCrXDWOQHkF7Z3GpE_8DsHlY1P-xN7M6LgR9W2KfYn3ZwEqH4T5U6V7W8X9Y0'::text as public_key,
    'private_key_placeholder'::text as private_key;
END;
$$;