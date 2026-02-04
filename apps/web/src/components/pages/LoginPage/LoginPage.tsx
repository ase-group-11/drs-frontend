import React from 'react';
import { AuthTemplate } from '../../templates';
import { LoginForm } from '../../organisms';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  return (
    <AuthTemplate 
      title="Welcome Back" 
      subtitle="Sign in to your account"
    >
      <LoginForm />
    </AuthTemplate>
  );
};

export default LoginPage;