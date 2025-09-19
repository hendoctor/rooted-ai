-- Update adoption_coaching table to add constraints for session_status
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

-- Update existing records to use proper case format
UPDATE adoption_coaching 
SET session_status = CASE 
  WHEN LOWER(session_status) = 'scheduled' THEN 'Scheduled'
  WHEN LOWER(session_status) = 'completed' THEN 'Completed'
  WHEN LOWER(session_status) = 'cancelled' THEN 'Canceled'
  WHEN LOWER(session_status) = 'rescheduled' THEN 'Rescheduled'
  ELSE 'Not Scheduled'
END
WHERE session_status IS NOT NULL;