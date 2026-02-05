import React from 'react';
import { Layout } from 'antd';
import { Logo } from '../../atoms';
import './AuthTemplate.css';

const { Content } = Layout;

interface AuthTemplateProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthTemplate: React.FC<AuthTemplateProps> = ({ children, title, subtitle }) => {
  return (
    <Layout className="auth-layout">
      <Content className="auth-content">
        <div className="auth-card">
          {/* Header with Logo */}
          <div className="auth-header">
            <div className="logo-container">
              <Logo width={100} height={110} />
            </div>
            <div 
              className="auth-title-container"
              style={{
                fontSize: '14px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FF4D4F 0%, #002766 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                marginTop: '16px'
              }}
            >
              DISASTER RESPONSE SYSTEM
            </div>
          </div>

          {/* Page Title */}
          <div className="auth-card-header">
            <h2 className="auth-card-title">{title}</h2>
            {subtitle && (
              <p className="auth-card-subtitle">{subtitle}</p>
            )}
          </div>

          {/* Form Content */}
          <div className="auth-card-body">
            {children}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default AuthTemplate;