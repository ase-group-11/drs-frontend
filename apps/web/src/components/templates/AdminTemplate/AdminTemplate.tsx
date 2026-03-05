// File: /web/src/components/templates/AdminTemplate/AdminTemplate.tsx
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Badge, Input, Dropdown, Button, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AlertOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DownOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../hooks';
import { useNavigate } from 'react-router-dom';
import './AdminTemplate.css';

const { Header, Sider, Content } = Layout;

interface AdminTemplateProps {
  children: React.ReactNode;
  selectedKey: string;
  breadcrumb?: string;
}

const MOBILE_BREAKPOINT = 768;

const AdminTemplate: React.FC<AdminTemplateProps> = ({
  children,
  selectedKey,
  breadcrumb = 'Dashboard / Overview',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              className="search-input"
            />

            <Badge dot>
              <Button type="text" icon={<BellOutlined />} className="notification-btn" />
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
    </Layout>
  );
};

export default AdminTemplate;
