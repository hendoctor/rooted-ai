import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface PublicOnlyGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const PublicOnlyGuard: React.FC<PublicOnlyGuardProps> = ({ 
  children, 
  redirectTo = '/' 
}) => {
  const { user, authReady } = useAuth();

  // Wait for auth to be ready before making decisions
  if (!authReady) {
    return null; // Or a loading spinner if preferred
  }

  // If user is authenticated, redirect them away
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated, allow access
  return <>{children}</>;
};

export default PublicOnlyGuard;