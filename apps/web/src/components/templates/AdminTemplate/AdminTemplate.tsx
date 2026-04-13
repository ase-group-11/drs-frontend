// File: /web/src/components/templates/AdminTemplate/AdminTemplate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Avatar, Badge, Dropdown, Button, Drawer } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../../../hooks';
import type { AppNotification } from '../../../hooks/useWebSocket';
import { useNotifications } from '../../../context/NotificationContext';
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

// ─── Severity → colour dot (now in router/index.tsx) ──────────────────────────

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

  const { notifications, connected, unreadCount, markAllRead, clearAll, setScrollToId } = useNotifications();

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

// NotificationProvider now lives in the router (src/router/index.tsx) so it
// persists across admin page navigation instead of remounting per-page.
// AdminTemplate is a pure layout shell — it reads from the context via useNotifications().
const AdminTemplate: React.FC<AdminTemplateProps> = (props) => (
  <AdminTemplateInner {...props} />
);

export default AdminTemplate;