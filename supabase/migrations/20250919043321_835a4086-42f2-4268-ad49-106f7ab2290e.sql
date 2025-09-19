-- Add new fields to adoption_coaching table for enhanced session information
ALTER TABLE public.adoption_coaching 
ADD COLUMN session_date timestamp with time zone,
ADD COLUMN session_duration integer DEFAULT 30, -- Duration in minutes
ADD COLUMN session_leader_id uuid REFERENCES auth.users(id),
ADD COLUMN session_status text DEFAULT 'scheduled' CHECK (session_status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
ADD COLUMN meeting_link text,
ADD COLUMN session_notes text;

-- Create index for faster queries on session_date
CREATE INDEX idx_adoption_coaching_session_date ON public.adoption_coaching(session_date);

-- Create index for session leader queries
CREATE INDEX idx_adoption_coaching_session_leader ON public.adoption_coaching(session_leader_id);

-- Update RLS policies to include session leader access
CREATE POLICY "Session leaders can view their sessions" 
ON public.adoption_coaching 
FOR SELECT 
USING (session_leader_id = auth.uid());

CREATE POLICY "Session leaders can update their sessions" 
ON public.adoption_coaching 
FOR UPDATE 
USING (session_leader_id = auth.uid());

-- Function to get session leader info with avatar
CREATE OR REPLACE FUNCTION get_session_with_leader_info(company_id_param uuid)
RETURNS TABLE (
  id uuid,
  topic text,
  description text,
  session_date timestamp with time zone,
  session_duration integer,
  session_status text,
  meeting_link text,
  session_notes text,
  leader_name text,
  leader_email text,
  leader_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.topic,
    ac.description,
    ac.session_date,
    ac.session_duration,
    ac.session_status,
    ac.meeting_link,
    ac.session_notes,
    u.display_name as leader_name,
    u.email as leader_email,
    u.avatar_url as leader_avatar_url
  FROM adoption_coaching ac
  JOIN adoption_coaching_companies acc ON acc.coaching_id = ac.id
  LEFT JOIN users u ON u.auth_user_id = ac.session_leader_id
  WHERE acc.company_id = company_id_param
    AND ac.session_date >= now()
    AND ac.session_status = 'scheduled'
  ORDER BY ac.session_date ASC;
END;
$$;