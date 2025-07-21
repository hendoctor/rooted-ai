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
  const role = userRole ?? 'public';
  if (!user || !requiredRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return children;
};

export default PrivateRoute;
