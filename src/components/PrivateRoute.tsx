import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthOptimized';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRoles: string[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { user, role: userRole, loading: authLoading } = useAuth();

  // Simplified access control
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking access..." />
      </div>
    );
  }
  
  // Check if user is authenticated and has required role
  if (!user || !userRole || !requiredRoles.includes(userRole)) {
    return <Navigate to="/access-denied" replace />;
  }
  
  return children;
};

export default PrivateRoute;
