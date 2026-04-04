import React, { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthTemplate } from '../../templates';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';

const PASSWORD_RULES = [
  { required: true, message: 'Please enter your new password' },
  { min: 8, message: 'Password must be at least 8 characters' },
  {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Must contain uppercase, lowercase, number and special character (@,$,!,%,*,?,&)',
  },
];

const ForgotPasswordForm: React.FC = () => {
  const [emailForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleRequest = async (values: { email: string }) => {
    setRequesting(true);
    try {
      await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.FORGOT_PASSWORD, {
        email: values.email,
      });
      setEmail(values.email);
      setStep('reset');
      message.success('Temporary password sent to your email.');
    } catch (err: any) {
      const raw = err?.response?.data?.detail ?? err?.message ?? 'Failed to send reset email.';
      const msg = typeof raw === 'string' ? raw.replace(/^rate_limit:\s*/i, '') : 'Failed to send reset email.';
      message.error(msg);
    } finally {
      setRequesting(false);
    }
  };

  const handleReset = async (values: { temp_password: string; new_password: string; confirm_password: string }) => {
    setResetting(true);
    try {
      await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.RESET_PASSWORD, {
        email,
        temp_password: values.temp_password,
        new_password: values.new_password,
      });
      message.success('Password reset successfully! Please log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      const raw = err?.response?.data?.detail ?? err?.message ?? 'Failed to reset password.';
      const msg = typeof raw === 'string' ? raw.replace(/^rate_limit:\s*/i, '') : 'Failed to reset password.';
      message.error(msg);
    } finally {
      setResetting(false);
    }
  };

  if (step === 'request') {
    return (
      <Form form={emailForm} layout="vertical" onFinish={handleRequest} requiredMark={false}>
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="Enter your registered email"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={requesting}
            block
            size="large"
          >
            Send Temporary Password
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
          Remember your password?{' '}
          <span
            onClick={() => navigate('/login')}
            style={{ color: '#7c3aed', fontWeight: 500, cursor: 'pointer' }}
          >
            Sign in
          </span>
        </div>
      </Form>
    );
  }

  return (
    <Form form={resetForm} layout="vertical" onFinish={handleReset} requiredMark={false}>
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#15803d',
      }}>
        A temporary password has been sent to <strong>{email}</strong>. Enter it below along with your new password.
      </div>

      <Form.Item
        name="temp_password"
        label="Temporary Password"
        rules={[{ required: true, message: 'Please enter the temporary password' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Enter temporary password" size="large" />
      </Form.Item>

      <Form.Item
        name="new_password"
        label="New Password"
        rules={PASSWORD_RULES}
        hasFeedback
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" size="large" />
      </Form.Item>

      <Form.Item
        name="confirm_password"
        label="Confirm New Password"
        dependencies={['new_password']}
        hasFeedback
        rules={[
          { required: true, message: 'Please confirm your new password' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('new_password') === value) return Promise.resolve();
              return Promise.reject(new Error('Passwords do not match'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" size="large" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={resetting}
          block
          size="large"
          style={{}}
        >
          Reset Password
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
        <span
          onClick={() => setStep('request')}
          style={{ color: '#7c3aed', fontWeight: 500, cursor: 'pointer' }}
        >
          ← Back
        </span>
      </div>
    </Form>
  );
};

const ForgotPasswordPage: React.FC = () => (
  <App>
    <AuthTemplate title="Reset Password" subtitle="Enter your email to receive a temporary password">
      <ForgotPasswordForm />
    </AuthTemplate>
  </App>
);

export default ForgotPasswordPage;