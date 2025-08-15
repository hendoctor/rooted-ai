import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useAuthRecovery = () => {
  const { user, userRole, setUserRole } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check if we have a cached role in localStorage
    const cachedRole = localStorage.getItem(`userRole_${user.email}`);
    
    // If we have a cached admin role and current role is null/Public, restore it
    if (cachedRole === 'Admin' && (!userRole || userRole === 'Public')) {
      console.log('Restoring cached admin role for:', user.email);
      setUserRole('Admin');
    }
    
    // Cache the current role if it's Admin
    if (userRole === 'Admin') {
      localStorage.setItem(`userRole_${user.email}`, 'Admin');
    }
    
    // Clean up old cached roles when user changes
    const currentCacheKey = `userRole_${user.email}`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('userRole_') && key !== currentCacheKey) {
        localStorage.removeItem(key);
      }
    });
  }, [user, userRole, setUserRole]);

  return null;
};