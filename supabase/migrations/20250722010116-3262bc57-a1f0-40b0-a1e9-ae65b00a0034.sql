-- Add user management page permissions
INSERT INTO role_permissions (role, page, access, visible, menu_item) VALUES
('Admin', '/user-management', true, true, 'User Management');

-- Make sure existing admin pages are accessible
UPDATE role_permissions 
SET access = true 
WHERE role = 'Admin' AND page IN ('/admin', '/admin-center');