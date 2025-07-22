-- Clean up admin page permissions and consolidate admin functionality
-- Remove admin-center and vapid-setup from menu, keep only /admin and /user-management visible
UPDATE role_permissions 
SET visible = false, menu_item = null 
WHERE role = 'Admin' AND page = '/admin-center';

UPDATE role_permissions 
SET visible = false, menu_item = null 
WHERE role = 'Admin' AND page = '/vapid-setup';

-- Update /admin to be the main admin page with proper menu item
UPDATE role_permissions 
SET menu_item = 'Admin Dashboard' 
WHERE role = 'Admin' AND page = '/admin';

-- Ensure only Admin role can access admin pages
DELETE FROM role_permissions WHERE role != 'Admin' AND page IN ('/admin', '/admin-center', '/user-management', '/vapid-setup');