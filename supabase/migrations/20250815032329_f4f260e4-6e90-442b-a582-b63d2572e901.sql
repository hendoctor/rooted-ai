-- Fix contact submissions table security
-- The table has customer data but no proper RLS protection for SELECT operations

-- First check current policies
-- Current policy only allows INSERT for everyone and SELECT for admins via complex subquery
-- This is insecure - need proper RLS policies

-- Drop existing insecure policy and create proper ones
DROP POLICY IF EXISTS "Only admins can view contact submissions" ON contact_submissions;

-- Create secure admin-only SELECT policy
CREATE POLICY "Admins can view contact submissions" ON contact_submissions
FOR SELECT USING (get_current_user_role() = 'Admin');

-- Verify INSERT policy exists and is secure (it should allow submissions)
-- The existing "Allow contact form submissions" policy is correct for INSERT