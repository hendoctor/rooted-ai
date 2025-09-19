-- First update all existing records to use valid status values
UPDATE adoption_coaching 
SET session_status = CASE 
  WHEN LOWER(session_status) = 'scheduled' THEN 'Scheduled'
  WHEN LOWER(session_status) = 'completed' THEN 'Completed'
  WHEN LOWER(session_status) = 'cancelled' THEN 'Canceled'
  WHEN LOWER(session_status) = 'canceled' THEN 'Canceled'
  WHEN LOWER(session_status) = 'rescheduled' THEN 'Rescheduled'
  WHEN LOWER(session_status) = 'confirmed' THEN 'Confirmed'
  WHEN LOWER(session_status) = 'draft' THEN 'Draft'
  WHEN LOWER(session_status) = 'live now' THEN 'Live Now'
  WHEN LOWER(session_status) = 'missed' THEN 'Missed / No-Show'
  WHEN LOWER(session_status) = 'no-show' THEN 'Missed / No-Show'
  WHEN LOWER(session_status) = 'not scheduled' THEN 'Not Scheduled'
  WHEN LOWER(session_status) = 'ongoing' THEN 'Ongoing'
  WHEN LOWER(session_status) = 'pending' THEN 'Pending Confirmation'
  WHEN LOWER(session_status) = 'recording available' THEN 'Recording Available'
  WHEN LOWER(session_status) = 'to be scheduled' THEN 'To Be Scheduled'
  WHEN LOWER(session_status) = 'upcoming' THEN 'Upcoming'
  ELSE 'Not Scheduled'
END
WHERE session_status IS NOT NULL;

-- Now add the constraint for session_status
ALTER TABLE adoption_coaching 
ADD CONSTRAINT valid_session_status 
CHECK (session_status IN (
  'Canceled',
  'Completed', 
  'Confirmed',
  'Draft',
  'Live Now',
  'Missed / No-Show',
  'Not Scheduled',
  'Ongoing',
  'Pending Confirmation',
  'Recording Available',
  'Rescheduled',
  'Scheduled',
  'To Be Scheduled',
  'Upcoming'
));