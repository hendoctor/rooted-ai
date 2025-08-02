import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useAuthDebug = () => {
  const { user, userRole, session, loading } = useAuth();

  useEffect(() => {
    console.log('Auth Debug:', {
      user: user ? { id: user.id, email: user.email } : null,
      userRole,
      hasSession: !!session,
      loading
    });
  }, [user, userRole, session, loading]);

  return { user, userRole, session, loading };
};