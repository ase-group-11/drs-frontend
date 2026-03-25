// MODIFIED FILE — changes: Handle ACCESS_DENIED error from auth to show "Admin only" message
import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks';
import type { LoginFormData } from '../../../types';
import './LoginForm.css';

const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { login } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true);
    setError('');
    try {
      await login(values.email, values.password);
      } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials.';
      if (msg === 'ACCESS_DENIED') {
        setError('Access denied. This administration panel is restricted to admin accounts only. Please contact your system administrator.');
        message.error('Access denied. Admin accounts only.');
      } else {
        setError(msg);
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">

      {error && (
        <Alert
          message={error}
          type={error.includes('Access denied') ? 'warning' : 'error'}
          showIcon
          className="login-error-alert"
          style={{ marginBottom: '16px' }}
        />
      )}

      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="admin@example.com"
            size="large"
            className="login-input"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter your password"
            size="large"
            className="login-input"
          />
        </Form.Item>

        <Form.Item>
          <div className="login-options">
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {}}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
          </div>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            className="login-submit-btn"
          >
            Sign In
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: '#6b7280' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#7c3aed', fontWeight: 500 }}>
            Sign up
          </Link>
        </div>
      </Form>
    </div>
  );
};

export default LoginForm;