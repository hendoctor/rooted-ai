-- Remove the non-existent user-management page reference
DELETE FROM role_permissions WHERE page = '/user-management';

-- Update the admin dashboard menu item name to just "Admin"
UPDATE role_permissions 
SET menu_item = 'Admin' 
WHERE page = '/admin' AND menu_item = 'Admin Dashboard';