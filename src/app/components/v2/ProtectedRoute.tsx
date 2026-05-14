import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  role: 'reception' | 'admin';
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isHydrating, isAuthenticated, isAdminAuthenticated } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (role === 'admin' && !isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role === 'reception' && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
