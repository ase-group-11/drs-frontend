import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../../hooks';
import './LoginForm.css';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
}

const LoginForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Login successful!');
    } catch (error: any) {
      message.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      name="login"
      onFinish={onFinish}
      layout="vertical"
      autoComplete="off"
      className="login-form"
    >
      <Form.Item
        name="email"
        label="Email Address"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email address' }
        ]}
      >
        <Input
          prefix={<MailOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
          placeholder="user@company.com"
          size="large"
          type="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[
          { required: true, message: 'Please enter your password' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
          placeholder="Enter password"
          size="large"
        />
      </Form.Item>

      <div className="login-form-options">
        <Form.Item name="rememberMe" valuePropName="checked" noStyle>
          <Checkbox>Remember me</Checkbox>
        </Form.Item>
        <a href="/forgot-password" className="forgot-password-link">
          Forgot password?
        </a>
      </div>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          className="login-submit-btn"
        >
          Log In
        </Button>
      </Form.Item>

      <div className="login-footer-text">
        <span>
          Don't have an account?{' '}
          <a href="/signup">Sign Up</a>
        </span>
      </div>
    </Form>
  );
};

export default LoginForm;