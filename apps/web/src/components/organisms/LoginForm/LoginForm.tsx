// MODIFIED FILE — changes: Handle ACCESS_DENIED error from auth to show "Admin only" message
import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
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
      if (err.message === 'ACCESS_DENIED') {
        setError(
          'Access denied. This administration panel is restricted to admin accounts only. Please contact your system administrator.'
        );
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
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
            <Form.Item name="rememberMe" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <a href="#" className="forgot-password-link">
              Forgot password?
            </a>
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
      </Form>
    </div>
  );
};

export default LoginForm;
