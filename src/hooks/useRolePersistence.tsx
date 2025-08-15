import { useEffect } from 'react';
import { useAuth } from './useAuth';

// Hook to ensure admin role persistence across page refreshes and errors
export const useRolePersistence = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    if (!user) {
      // Clear any stored role when user logs out
      localStorage.removeItem('user_role_backup');
      return;
    }

    // Store the role when it's set to Admin
    if (userRole === 'Admin') {
      console.log('🔐 Backing up Admin role to localStorage');
      localStorage.setItem('user_role_backup', JSON.stringify({
        role: userRole,
        email: user.email,
        timestamp: Date.now()
      }));
    }

    // If user is logged in but role is null/Client, check for backup
    if (user && (!userRole || userRole === 'Client')) {
      const backup = localStorage.getItem('user_role_backup');
      if (backup) {
        try {
          const parsed = JSON.parse(backup);
          // Only restore if it's for the same user and within 24 hours
          if (parsed.email === user.email && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
            console.log('🔄 Restoring role from backup:', parsed.role);
            setUserRole(parsed.role);
          } else {
            console.log('🗑️ Clearing expired role backup');
            localStorage.removeItem('user_role_backup');
          }
        } catch (error) {
          console.error('❌ Error parsing role backup:', error);
          localStorage.removeItem('user_role_backup');
        }
      }
    }
  }, [user, userRole, setUserRole]);
};