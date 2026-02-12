// File: /web/src/router/index.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import StaffManagerRoute from './StaffManagerRoute';
import PublicRoute from './PublicRoute';
import {
  SignupPage,
  LoginPage,
  OtpPage,
  DashboardPage,
  DisasterReportsPage,
  StaffManagerDashboardPage,
} from '../components/pages';
import { useAuth } from '../hooks';

// Helper component to handle root redirect based on role
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Get user role and convert to lowercase
  const userRole = user?.role?.toLowerCase() || '';

  // Redirect based on role
  if (userRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (userRole === 'manager' || userRole === 'staff') {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/unauthorized" replace />;
  }
};

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/otp" element={<OtpPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/disaster-reports"
        element={
          <AdminRoute>
            <DisasterReportsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <div style={{ padding: '24px' }}>User Management - Coming Soon</div>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <AdminRoute>
            <div style={{ padding: '24px' }}>Emergency Teams - Coming Soon</div>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/locations"
        element={
          <AdminRoute>
            <div style={{ padding: '24px' }}>Locations & Zones - Coming Soon</div>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <AdminRoute>
            <div style={{ padding: '24px' }}>Analytics - Coming Soon</div>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <div style={{ padding: '24px' }}>Settings - Coming Soon</div>
          </AdminRoute>
        }
      />

      {/* Staff/Manager Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <StaffManagerRoute>
            <StaffManagerDashboardPage />
          </StaffManagerRoute>
        }
      />

      {/* Unauthorized Access */}
      <Route
        path="/unauthorized"
        element={
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <h1>Unauthorized Access</h1>
            <p>You don't have permission to access this page.</p>
          </div>
        }
      />

      {/* Root and catch-all routes - redirect based on user role */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export default AppRouter;
