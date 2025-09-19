-- Clean up existing adoption_coaching records with invalid session_leader_id values
-- Convert known string values to proper UUIDs or set to null

UPDATE adoption_coaching 
SET session_leader_id = '323c39ab-bb6c-4a14-ac2d-5abd2a9a0e97'
WHERE session_leader_id = 'james-hennahane';

-- Set invalid string values to null (like 'philip-niemerg', 'rootedai-team', or company references)
UPDATE adoption_coaching 
SET session_leader_id = null
WHERE session_leader_id IS NOT NULL 
  AND session_leader_id != '323c39ab-bb6c-4a14-ac2d-5abd2a9a0e97'
  AND (
    session_leader_id = 'philip-niemerg' 
    OR session_leader_id = 'rootedai-team'
    OR session_leader_id LIKE 'company-%'
    OR session_leader_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );