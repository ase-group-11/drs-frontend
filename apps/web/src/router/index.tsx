import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import PublicRoute from './PublicRoute';
import {
  SignupPage,
  LoginPage,
  OtpPage,
  DashboardPage,
  DisasterReportsPage,
  UserManagementPage,
  EmergencyTeamsPage,
  SettingsPage,
} from '../components/pages';
import { useAuth } from '../hooks';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role?.toLowerCase() === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/unauthorized" replace />;
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
        path="/admin/users"
        element={
          <AdminRoute>
            <UserManagementPage />
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
        path="/admin/teams"
        element={
          <AdminRoute>
            <EmergencyTeamsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <SettingsPage />
          </AdminRoute>
        }
      />

      {/* Access Denied */}
      <Route
        path="/unauthorized"
        element={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              padding: '48px',
              textAlign: 'center',
              background: '#f5f5f5',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '48px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                maxWidth: '400px',
              }}
            >
              <h1 style={{ color: '#EF4444', marginBottom: '12px' }}>Access Denied</h1>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                This panel is restricted to administrators only. If you believe this is an error,
                please contact your system administrator.
              </p>
              <a href="/login" style={{ color: '#7c3aed' }}>
                Return to Login
              </a>
            </div>
          </div>
        }
      />

      {/* Root and catch-all */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export default AppRouter;
