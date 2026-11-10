import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  allowedRoles?: Array<'OWNER' | 'EMPLOYEE'>;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<Props> = ({
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the right dashboard
    return <Navigate to={user.role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard'} replace />;
  }

  return <Outlet />;
};

export const GuestRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard'} replace />;
  }

  return <Outlet />;
};

