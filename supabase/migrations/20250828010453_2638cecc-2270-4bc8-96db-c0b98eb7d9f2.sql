
-- CAUTION: We are only dropping custom triggers on auth.users that this project created in migrations.
-- This is necessary to prevent 500 "Database error creating new user" during invitation redemption.

-- Drop invitation/signup triggers on auth.users if they exist
drop trigger if exists on_auth_user_created_handle_invitation on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_users on auth.users;
