// File: /web/src/components/pages/StaffManagerDashboardPage/StaffManagerDashboardPage.tsx
import React from 'react';
import { Layout, Button, Typography, Space } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../../hooks';
import './StaffManagerDashboardPage.css';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const StaffManagerDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <Layout className="staff-manager-layout">
      <Header className="staff-manager-header">
        <div className="header-left">
          <div className="logo-icon">DR</div>
          <span className="logo-text">Disaster Response System</span>
        </div>
        <div className="header-right">
          <span className="user-name">
            <UserOutlined /> {user?.fullName}
          </span>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </Header>
      
      <Content className="staff-manager-content">
        <div className="placeholder-container">
          <div className="placeholder-icon">
            <UserOutlined style={{ fontSize: 80, color: '#7c3aed' }} />
          </div>
          <Space direction="vertical" size="large" align="center">
            <Title level={2}>Welcome, {user?.fullName}!</Title>
            <Paragraph className="placeholder-text">
              Your dashboard is currently under development.
            </Paragraph>
            <Paragraph className="placeholder-subtext">
              Role: <strong>{user?.role?.toUpperCase()}</strong>
            </Paragraph>
            <Paragraph className="placeholder-subtext">
              Department: <strong>{user?.department?.toUpperCase()}</strong>
            </Paragraph>
            <div className="info-box">
              <Paragraph>
                The interface for {user?.role} users will be available soon.
                Please check back later or contact your administrator for more information.
              </Paragraph>
            </div>
          </Space>
        </div>
      </Content>
    </Layout>
  );
};

export default StaffManagerDashboardPage;
