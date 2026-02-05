import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';

interface PublicRouteProps {
  children: React.ReactElement;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Navigate to="/home" replace /> : children;
};

export default PublicRoute;