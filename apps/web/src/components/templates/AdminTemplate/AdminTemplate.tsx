// File: /web/src/components/templates/AdminTemplate/AdminTemplate.tsx
import React, { useState } from 'react';
import { Layout, Menu, Avatar, Badge, Input, Dropdown, Button } from 'antd';
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

const AdminTemplate: React.FC<AdminTemplateProps> = ({
  children,
  selectedKey,
  breadcrumb = 'Dashboard / Overview',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const siderWidth = collapsed ? 80 : 256;

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/admin/dashboard'),
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'User Management',
      onClick: () => navigate('/admin/users'),
    },
    {
      key: 'reports',
      icon: <AlertOutlined />,
      label: 'Disaster Reports',
      onClick: () => navigate('/admin/disaster-reports'),
    },
    {
      key: 'teams',
      icon: <TeamOutlined />,
      label: 'Emergency Teams',
      onClick: () => navigate('/admin/teams'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/admin/settings'),
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

  return (
    <Layout className="admin-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="admin-sider"
        width={256}
        breakpoint="lg"
        collapsedWidth={80}
      >
        <div className="admin-logo">
          <div className="logo-icon">DR</div>
          {!collapsed && <span className="logo-text">Admin Panel</span>}
        </div>

        <div className="admin-user-profile">
          <Avatar size={40}>{user?.fullName?.charAt(0) || 'A'}</Avatar>
          {!collapsed && (
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
          {!collapsed && (
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
          {collapsed && (
            <div className="logout-icon-only" onClick={logout}>
              <LogoutOutlined />
            </div>
          )}
        </div>
      </Sider>

      {/* Main area offset by fixed sider width */}
      <Layout className="admin-main" style={{ marginLeft: siderWidth }}>
        <Header
          className="admin-header"
          style={{
            left: siderWidth,
          }}
        >
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
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
