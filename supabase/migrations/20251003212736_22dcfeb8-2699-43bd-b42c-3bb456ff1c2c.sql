-- Performance optimization: Add indexes for faster auth and portal queries
-- These indexes will significantly speed up user authentication and data loading

-- Index for company_memberships lookups (used heavily in auth context)
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company 
ON company_memberships(user_id, company_id);

-- Index for users table auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON users(auth_user_id) INCLUDE (avatar_url, role, email);

-- Index for faster portal content company joins
CREATE INDEX IF NOT EXISTS idx_announcement_companies_company 
ON announcement_companies(company_id, announcement_id);

CREATE INDEX IF NOT EXISTS idx_portal_resource_companies_company 
ON portal_resource_companies(company_id, resource_id);

CREATE INDEX IF NOT EXISTS idx_useful_link_companies_company 
ON useful_link_companies(company_id, link_id);

CREATE INDEX IF NOT EXISTS idx_ai_tool_companies_company 
ON ai_tool_companies(company_id, ai_tool_id);

CREATE INDEX IF NOT EXISTS idx_faq_companies_company 
ON faq_companies(company_id, faq_id);

CREATE INDEX IF NOT EXISTS idx_report_companies_company 
ON report_companies(company_id, report_id);

CREATE INDEX IF NOT EXISTS idx_adoption_coaching_companies_company 
ON adoption_coaching_companies(company_id, coaching_id);

-- Index for session leader lookups
CREATE INDEX IF NOT EXISTS idx_adoption_coaching_session_leader 
ON adoption_coaching(session_leader_id, session_date) 
WHERE session_status = 'scheduled';

-- Composite index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read, created_at DESC);

-- Index for newsletter subscriptions
CREATE INDEX IF NOT EXISTS idx_newsletter_user_email 
ON newsletter_subscriptions(user_id, email, status);

-- Add statistics for query planner optimization
ANALYZE company_memberships;
ANALYZE users;
ANALYZE announcement_companies;
ANALYZE portal_resource_companies;
ANALYZE useful_link_companies;
ANALYZE ai_tool_companies;
ANALYZE faq_companies;
ANALYZE report_companies;
ANALYZE adoption_coaching_companies;
ANALYZE adoption_coaching;
ANALYZE notifications;
ANALYZE newsletter_subscriptions;