import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRoles: string[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { user, userRole, loading } = useAuth();
  if (loading) return null;

  const role = userRole ?? 'Public';
  const hasAccess = requiredRoles.includes(role);
  if (!user || !hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }
  
  return children;
};

export default PrivateRoute;
