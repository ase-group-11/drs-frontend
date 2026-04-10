// File: /web/src/components/templates/AdminTemplate/AdminTemplate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Avatar, Badge, Dropdown, Button, Drawer, App } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AlertOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DownOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../hooks';
import type { AppNotification } from '../../../hooks/useWebSocket';
import { NotificationProvider, useNotifications } from '../../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import NotificationPanel from '../../organisms/Notifications/NotificationPanel';
import './AdminTemplate.css';

const { Header, Sider, Content } = Layout;

interface AdminTemplateProps {
  children: React.ReactNode;
  selectedKey: string;
  breadcrumb?: string;
}

const MOBILE_BREAKPOINT = 768;

// ─── Severity → toast icon ────────────────────────────────────────────────────

// ─── Severity → colour dot ────────────────────────────────────────────────────

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

// ─── Notification sound via Web Audio API (no external files needed) ─────────

function playNotificationSound(severity: AppNotification['severity']) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const configs: Record<AppNotification['severity'], { freq: number; freq2: number; duration: number; gain: number }> = {
      critical: { freq: 880, freq2: 660, duration: 0.6, gain: 0.4 },
      high:     { freq: 660, freq2: 550, duration: 0.4, gain: 0.3 },
      medium:   { freq: 520, freq2: 440, duration: 0.3, gain: 0.25 },
      low:      { freq: 440, freq2: 400, duration: 0.2, gain: 0.2 },
      info:     { freq: 400, freq2: 380, duration: 0.2, gain: 0.15 },
    };

    const { freq, freq2, duration, gain } = configs[severity];

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration * 0.6);

    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    // For critical, add a second beep
    if (severity === 'critical') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.9);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.9);
    }

    osc.onended = () => ctx.close();
  } catch {
    // Browser may block AudioContext before user interaction — silently ignore
  }
}

const AdminTemplateInner: React.FC<AdminTemplateProps> = ({
  children,
  selectedKey,
  breadcrumb = 'Dashboard / Overview',
}) => {
  const [collapsed, setCollapsed]               = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile]                 = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [panelOpen, setPanelOpen]               = useState(false);
  const { user, logout }                        = useAuth();
  const navigate                                = useNavigate();

  const { notifications, connected, unreadCount, markAllRead, clearAll, setScrollToId, soundEnabled } = useNotifications();

  // Keep module-level ref in sync so the bridge callback can read it
  soundEnabledRef.current = soundEnabled;

  const handleNotificationClick = useCallback((n: AppNotification) => {
    setPanelOpen(false);

    // Chat notifications → open the chat for that disaster directly
    if (n.eventType === 'chat.message') {
      const disasterId = n.raw?.data?.disaster_id;
      if (disasterId) {
        navigate('/admin/disaster-reports', { state: { openChatForDisasterId: disasterId } });
        return;
      }
    }

    // All other notifications → system activity with scroll
    setScrollToId(n.id);
    navigate('/admin/dashboard', { state: { scrollToId: n.id } });
  }, [setScrollToId, navigate]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const siderWidth = collapsed ? 80 : 256;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => handleNavigate('/admin/dashboard'),
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'User Management',
      onClick: () => handleNavigate('/admin/users'),
    },
    {
      key: 'reports',
      icon: <AlertOutlined />,
      label: 'Disaster Reports',
      onClick: () => handleNavigate('/admin/disaster-reports'),
    },
    {
      key: 'teams',
      icon: <TeamOutlined />,
      label: 'Emergency Teams',
      onClick: () => handleNavigate('/admin/teams'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => handleNavigate('/admin/settings'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: () => logout(),
    },
  ];

  const SidebarContent = ({ showCollapsed = false }: { showCollapsed?: boolean }) => (
    <>
      <div className="admin-logo">
        <div className="logo-icon">DR</div>
        {!showCollapsed && <span className="logo-text">Admin Panel</span>}
      </div>

      <div className="admin-user-profile">
        <Avatar size={40}>{user?.fullName?.charAt(0) || 'A'}</Avatar>
        {!showCollapsed && (
          <div className="user-info">
            <div className="user-name">{user?.fullName || 'Admin User'}</div>
            <div className="user-status">
              <span className="status-indicator" />
              <span className="status-text">{user?.role}</span>
            </div>
          </div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        className="admin-menu"
      />

      <div className="admin-footer">
        {!showCollapsed && (
          <>
            <div className="version-status">
              <span className="version">v1.0.0</span>
              <span className="status-badge">ONLINE</span>
            </div>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={logout}
              block
              className="logout-btn"
            >
              Sign Out
            </Button>
          </>
        )}
        {showCollapsed && (
          <div className="logout-icon-only" onClick={logout}>
            <LogoutOutlined />
          </div>
        )}
      </div>
    </>
  );

  return (
    <Layout className="admin-layout">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="admin-sider"
          width={256}
          collapsedWidth={80}
        >
          <SidebarContent showCollapsed={collapsed} />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={256}
          className="admin-mobile-drawer"
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <div className="mobile-drawer-close">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setMobileDrawerOpen(false)}
              className="drawer-close-btn"
            />
          </div>
          <div className="admin-sider-inner">
            <SidebarContent showCollapsed={false} />
          </div>
        </Drawer>
      )}

      {/* Main area */}
      <Layout
        className="admin-main"
        style={!isMobile ? { marginLeft: siderWidth } : { marginLeft: 0 }}
      >
        <Header
          className="admin-header"
          style={!isMobile ? { left: siderWidth } : { left: 0 }}
        >
          <div className="header-left">
            <Button
              type="text"
              icon={
                isMobile
                  ? <MenuUnfoldOutlined />
                  : collapsed
                  ? <MenuUnfoldOutlined />
                  : <MenuFoldOutlined />
              }
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              className="trigger-btn"
            />
            <span className="breadcrumb">{breadcrumb}</span>
          </div>

          <div className="header-right">

            <Badge count={unreadCount} size="small" style={{ background: '#7c3aed' }}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="notification-btn"
                onClick={() => { setPanelOpen(true); markAllRead(); }}
                style={connected ? {} : { color: '#9ca3af' }}
              />
            </Badge>

            <div className="divider" />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-dropdown">
                <Avatar size={32}>{user?.fullName?.charAt(0) || 'A'}</Avatar>
                <DownOutlined className="dropdown-icon" />
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="admin-content">{children}</Content>
      </Layout>

      {/* Notification slide-in panel */}
      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        connected={connected}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
        onNotificationClick={handleNotificationClick}
      />

      {/* Global notification toast overrides */}
      <style>{`
        /* ── Width: lock every layer of Ant's notification stack ── */
        .ant-notification,
        .ant-notification-topRight {
          width: 300px !important;
          max-width: 300px !important;
        }

        /* Motion wrapper Ant wraps each item in */
        .ant-notification-topRight .ant-notification-notice-wrapper,
        .ant-notification-topRight > div,
        .ant-notification-topRight [class*="motion"] {
          width: 300px !important;
          max-width: 300px !important;
        }

        /* The actual notice card */
        .ant-notification-notice {
          width: 300px !important;
          min-width: 300px !important;
          max-width: 300px !important;
          padding: 12px 36px 12px 14px !important;
          border-radius: 10px !important;
          min-height: 0 !important;
          background: #ffffff !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.09) !important;
          overflow: hidden !important;
          position: relative !important;
        }

        /* Kill the highlight/shadow layer on the newest notification */
        .ant-notification-notice::before,
        .ant-notification-notice::after,
        .ant-notification-notice-wrapper::before,
        .ant-notification-notice-wrapper::after {
          display: none !important;
          content: none !important;
          background: none !important;
          box-shadow: none !important;
        }
        .ant-notification-notice-wrapper {
          filter: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        /* Close button — push it away from text */
        .ant-notification-notice-close {
          position: absolute !important;
          top: 10px !important;
          right: 10px !important;
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #9ca3af !important;
          font-size: 12px !important;
        }
        .ant-notification-notice-close:hover {
          color: #374151 !important;
          background: #f3f4f6 !important;
          border-radius: 4px !important;
        }

        /* Text */
        .ant-notification-notice-message {
          margin-bottom: 2px !important;
          margin-right: 0 !important;
          padding-right: 16px !important;
          font-size: 13px !important;
          line-height: 1.3 !important;
        }
        .ant-notification-notice-description {
          font-size: 12px !important;
          color: #6b7280 !important;
          line-height: 1.4 !important;
          margin-top: 3px !important;
          padding-right: 16px !important;
        }
        .ant-notification-notice-icon {
          font-size: 15px !important;
          position: absolute !important;
          top: 50% !important;
          left: 14px !important;
          transform: translateY(-50%) !important;
          line-height: 1 !important;
        }
        .ant-notification-notice-with-icon .ant-notification-notice-message,
        .ant-notification-notice-with-icon .ant-notification-notice-description {
          margin-left: 26px !important;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .ant-notification,
          .ant-notification-topRight {
            top: 56px !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 12px !important;
          }
          .ant-notification-topRight .ant-notification-notice-wrapper,
          .ant-notification-topRight > div,
          .ant-notification-topRight [class*="motion"] {
            width: 100% !important;
            max-width: 100% !important;
          }
          .ant-notification-notice {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin-bottom: 6px !important;
          }
        }
      `}</style>
    </Layout>
  );
};

// Module-level ref so the bridge (outside NotificationProvider) can read soundEnabled
const soundEnabledRef = { current: true };

// Bridge: reads toast from App context and passes handler into NotificationProvider
const AdminTemplateWithNotifications: React.FC<AdminTemplateProps> = (props) => {
  const { notification: toast } = App.useApp();

  const handleNotification = useCallback((n: AppNotification) => {
    if (n.eventType === 'vehicle.location_updated') return;

    // Sound gated by soundEnabled from context — read via ref to avoid stale closure
    if (soundEnabledRef.current) playNotificationSound(n.severity);

    const dot = SEVERITY_DOT[n.severity];
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
      duration: isCritical ? 0 : 5,
      icon: severityIcon(n.severity),
      style: {
        padding: '14px 36px 14px 14px',
        borderRadius: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.09)',
        width: 300,
        minWidth: 300,
        maxWidth: 300,
        borderLeft: `3px solid ${dot}`,
        background: '#ffffff',
        overflow: 'hidden',
      },
    });
  }, [toast]);

  return (
    <NotificationProvider onNotification={handleNotification}>
      <AdminTemplateInner {...props} />
    </NotificationProvider>
  );
};

// Wrap in App context so toast works
const AdminTemplate: React.FC<AdminTemplateProps> = (props) => (
  <App>
    <AdminTemplateWithNotifications {...props} />
  </App>
);

export default AdminTemplate;