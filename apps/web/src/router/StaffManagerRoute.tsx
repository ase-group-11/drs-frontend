// File: /web/src/router/StaffManagerRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';

interface StaffManagerRouteProps {
  children: React.ReactElement;
}

const StaffManagerRoute: React.FC<StaffManagerRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Convert role to lowercase for case-insensitive comparison
  const userRole = user?.role?.toLowerCase();

  // Only manager and staff can access this route
  if (userRole !== 'manager' && userRole !== 'staff') {
    // Admin users should go to admin dashboard
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Unknown roles go to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default StaffManagerRoute;
