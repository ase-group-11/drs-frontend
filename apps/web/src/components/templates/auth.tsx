// apps/web/src/components/templates/authtemplate/index.tsx
import React, { Component } from 'react';

interface AuthTemplateProps {
  children: React.ReactNode;
}

export class AuthTemplate extends Component<AuthTemplateProps> {
  render() {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '480px'
        }}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default AuthTemplate;