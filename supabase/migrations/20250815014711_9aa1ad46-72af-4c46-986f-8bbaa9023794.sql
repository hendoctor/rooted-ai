-- Drop the existing status check constraint
ALTER TABLE public.user_invitations DROP CONSTRAINT user_invitations_status_check;

-- Add the updated constraint that includes 'cancelled' status
ALTER TABLE public.user_invitations 
ADD CONSTRAINT user_invitations_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text]));