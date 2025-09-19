-- Test the function directly to see if it works
DO $$
DECLARE
  test_record RECORD;
BEGIN
  -- Test with a real useful link assignment
  SELECT * INTO test_record FROM useful_link_companies WHERE created_at > '2025-09-19 13:30:00'::timestamp LIMIT 1;
  
  IF test_record IS NOT NULL THEN
    RAISE NOTICE 'Found test record: company_id=%, link_id=%', test_record.company_id, test_record.link_id;
    
    -- Manually call the function to test
    PERFORM create_unified_content_notification();
  ELSE
    RAISE NOTICE 'No test records found';
  END IF;
END $$;