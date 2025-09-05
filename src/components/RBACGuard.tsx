import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canUser, Role } from '@/lib/rbac';

interface RBACGuardProps {
  page: string;
  children: React.ReactNode;
}

const RBACGuard: React.FC<RBACGuardProps> = ({ page, children }) => {
  const { userRole } = useAuth();
  const role = (userRole === 'Client' ? 'User' : userRole) as Role | null;
  const allowed = canUser(role, page);

  if (!allowed) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

export default RBACGuard;
