import React, { useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { App } from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
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
import ForgotPasswordPage from '../components/pages/ForgotPasswordPage/ForgotPasswordPage';
import { useAuth } from '../hooks';
import { NotificationProvider, useNotifications } from '../context/NotificationContext';
import type { AppNotification } from '../hooks/useWebSocket';
import { playNotificationSound } from '../utils/audioUtils';

// ─── Severity helpers (used by the toast handler) ─────────────────────────────

const SEVERITY_DOT: Record<AppNotification['severity'], string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#3b82f6',
  info:     '#22c55e',
};

function severityIcon(severity: AppNotification['severity']) {
  switch (severity) {
    case 'critical': return <ExclamationCircleOutlined style={{ color: '#ef4444' }} />;
    case 'high':     return <WarningOutlined           style={{ color: '#f97316' }} />;
    case 'medium':   return <WarningOutlined           style={{ color: '#eab308' }} />;
    case 'low':      return <InfoCircleOutlined        style={{ color: '#3b82f6' }} />;
    default:         return <CheckCircleOutlined       style={{ color: '#22c55e' }} />;
  }
}

// ─── SoundEnabledSync ─────────────────────────────────────────────────────────
// Tiny component that lives *inside* NotificationProvider so it can read
// soundEnabled from context and keep the ref used by the toast handler current.
// Renders nothing — purely a side-effect bridge.

const SoundEnabledSync: React.FC<{ soundRef: React.MutableRefObject<boolean> }> = ({ soundRef }) => {
  const { soundEnabled } = useNotifications();
  soundRef.current = soundEnabled;
  return null;
};

// ─── AdminNotificationWrapper ─────────────────────────────────────────────────
// React Router layout route that owns the single NotificationProvider for the
// entire admin area.  Renders once on entering /admin/*, stays mounted while
// navigating between admin pages, and unmounts naturally on logout (which
// navigates to /login — outside this layout).

const AdminNotificationWrapper: React.FC = () => {
  const { notification: toast } = App.useApp();

  // Ref keeps the toast handler from stale-closing over soundEnabled while
  // still allowing the handler to read the latest value on every invocation.
  const soundRef = useRef(true);

  const handleNotification = useCallback((n: AppNotification) => {
    // High-frequency positional updates — never toast these
    if (n.eventType === 'vehicle.location_updated') return;

    if (soundRef.current) playNotificationSound(n.severity);

    const dot        = SEVERITY_DOT[n.severity];
    const isCritical = n.severity === 'critical';

    toast.open({
      message: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dot, flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>
            {n.title}
          </span>
        </div>
      ),
      placement: 'topRight',
      duration:  isCritical ? 0 : 5,
      icon:      severityIcon(n.severity),
      style: {
        padding:    '14px 36px 14px 14px',
        borderRadius: 10,
        boxShadow:  '0 2px 10px rgba(0,0,0,0.09)',
        width: 300, minWidth: 300, maxWidth: 300,
        borderLeft: `3px solid ${dot}`,
        background: '#ffffff',
        overflow:   'hidden',
      },
    });
  }, [toast]);

  return (
    <NotificationProvider onNotification={handleNotification}>
      {/* Keeps soundRef in sync with the context value on every render */}
      <SoundEnabledSync soundRef={soundRef} />
      <Outlet />
    </NotificationProvider>
  );
};

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role?.toLowerCase() === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/unauthorized" replace />;
};

// ─── Router ───────────────────────────────────────────────────────────────────

const AppRouter: React.FC = () => (
  <>
    <ScrollToTop />
    <Routes>
      {/* Public routes */}
      <Route path="/signup"          element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/otp"             element={<OtpPage />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Admin routes — single NotificationProvider mounts here, never remounts on navigation */}
      <Route element={<AdminNotificationWrapper />}>
        <Route path="/admin/dashboard"        element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/admin/users"            element={<AdminRoute><UserManagementPage /></AdminRoute>} />
        <Route path="/admin/disaster-reports" element={<AdminRoute><DisasterReportsPage /></AdminRoute>} />
        <Route path="/admin/teams"            element={<AdminRoute><EmergencyTeamsPage /></AdminRoute>} />
        <Route path="/admin/settings"         element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>

      <Route path="/unauthorized" element={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '48px', textAlign: 'center', background: '#f5f5f5' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '48px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: '400px' }}>
            <h1 style={{ color: '#EF4444', marginBottom: '12px' }}>Access Denied</h1>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              This panel is restricted to administrators only. If you believe this is an error, please contact your system administrator.
            </p>
            <a href="/login" style={{ color: '#7c3aed' }}>Return to Login</a>
          </div>
        </div>
      } />

      <Route path="/"  element={<RootRedirect />} />
      <Route path="*"  element={<RootRedirect />} />
    </Routes>
  </>
);

export default AppRouter;