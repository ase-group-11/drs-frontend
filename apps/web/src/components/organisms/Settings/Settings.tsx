// NEW FILE
import React, { useState, useEffect } from 'react';
import {
  App,
  Button,
  Input,
  Switch,
  Form,
  Typography,
  Card,
  Spin,
} from 'antd';
import {
  SettingOutlined,
  BellOutlined,
  LockOutlined,
  DatabaseOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { changeAdminPassword, getSystemStatus } from '../../../services';
import { useNotifications } from '../../../context/NotificationContext';
import type { SystemStatus } from '../../../types';
import styles from './Settings.module.css';

const { Text } = Typography;

// ─── General Tab ────────────────────────────────────────────────────────────
const GeneralTab: React.FC = () => {
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const fields = [
    { label: 'Full Name',     value: user.fullName      || '—' },
    { label: 'Email',         value: user.email         || '—' },
    { label: 'Phone Number',  value: user.phoneNumber   || '—' },
    { label: 'Role',          value: user.role          || '—' },
    { label: 'Department',    value: user.department    || '—' },
    { label: 'Employee ID',   value: user.employeeId    || '—' },
  ];

  return (
    <Card className={styles.settingsCard}>
      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20 }}>User Information</Text>
      <div className={styles.fieldGrid2}>
        {fields.map(({ label, value }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</Text>
            <Input value={value} readOnly variant="filled"
              style={{ background: '#f3f4f6', cursor: 'default', color: '#111827' }} />
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Notifications Tab ───────────────────────────────────────────────────────

// ─── Notifications Tab ───────────────────────────────────────────────────────
const NotificationsTab: React.FC = () => {
  const { socketEnabled, soundEnabled, toggleSocket, toggleSound, connected } = useNotifications();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6, color: '#111827' }}>
          Notification Settings
        </Text>
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 24 }}>
          These settings are session-only and reset to ON on every login.
        </Text>

        {/* WebSocket toggle */}
        <div className={`${styles.toggleRow}`}>
          <div>
            <Text strong style={{ fontSize: 14, display: 'block', color: '#111827' }}>
              Live Notifications
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {socketEnabled
                ? connected ? 'Connected — receiving live events' : 'Connecting...'
                : 'Disconnected — no live events will be received'}
            </Text>
          </div>
          <Switch
            checked={socketEnabled}
            onChange={toggleSocket}
            style={socketEnabled ? { background: '#7c3aed' } : {}}
          />
        </div>

        {/* Sound toggle */}
        <div className={`${styles.toggleRow} ${styles.toggleRowLast}`}>
          <div>
            <Text strong style={{ fontSize: 14, display: 'block', color: '#111827' }}>
              Notification Sound
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {soundEnabled ? 'Audio alert plays on new notifications' : 'Silent — no sound on notifications'}
            </Text>
          </div>
          <Switch
            checked={soundEnabled}
            onChange={toggleSound}
            style={soundEnabled ? { background: '#7c3aed' } : {}}
          />
        </div>
      </Card>
    </div>
  );
};

// ─── Security Tab ────────────────────────────────────────────────────────────
const SecurityTab: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields();
      const { currentPassword, newPassword } = values;

      setSaving(true);

      const res = await changeAdminPassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        message.success('Password changed successfully');
        form.resetFields();
      } else {
        message.error(res.message || 'Failed to change password');
      }
    } catch {
      // validation error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={styles.settingsCard}>
      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20 }}>
        Password & Authentication
      </Text>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: 'Please enter your current password' }]}
        >
          <Input.Password variant="filled" placeholder="Enter current password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password variant="filled" placeholder="Enter new password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password variant="filled" placeholder="Confirm new password" />
        </Form.Item>

        <Button
          type="primary"
          loading={saving}
          onClick={handleChangePassword}
          style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
        >
          Change Password
        </Button>
      </Form>
    </Card>
  );
};


// ─── System Tab ───────────────────────────────────────────────────────────────
const SystemTab: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await getSystemStatus();
      if (res.data) setStatus(res.data);
    } catch {
      // API not available yet — show placeholder
    } finally {
      setLoading(false);
    }
  };

  const displayStatus: SystemStatus = status ?? {
    databaseStatus: 'Down',
    apiStatus: 'Down',
    version: 'N/A',
    dbVersion: 'N/A',
    serverRegion: 'N/A',
    lastBackup: 'N/A',
    uptime: 'N/A',
  };

  if (loading) return <div className={styles.tabLoading}><Spin /></div>;

  const isOperational = displayStatus.databaseStatus === 'Operational';
  const isHealthy = displayStatus.apiStatus === 'Healthy';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>System Status</Text>
        <div className={styles.statusGrid}>
          <div className={`${styles.statusCard} ${isOperational ? styles.statusCardGreen : styles.statusCardRed}`}>
            <div className={`${styles.statusIcon} ${isOperational ? styles.statusIconGreen : styles.statusIconRed}`}>
              <DatabaseOutlined style={{ color: isOperational ? '#16a34a' : '#dc2626', fontSize: 22 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Database Status</Text>
              <Text strong style={{ fontSize: 16, display: 'block', color: isOperational ? '#15803d' : '#dc2626' }}>
                {displayStatus.databaseStatus}
              </Text>
            </div>
          </div>

          <div className={`${styles.statusCard} ${isHealthy ? styles.statusCardBlue : styles.statusCardRed}`}>
            <div className={`${styles.statusIcon} ${isHealthy ? styles.statusIconBlue : styles.statusIconRed}`}>
              <WifiOutlined style={{ color: isHealthy ? '#2563eb' : '#dc2626', fontSize: 22 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>API Status</Text>
              <Text strong style={{ fontSize: 16, display: 'block', color: isHealthy ? '#1d4ed8' : '#dc2626' }}>
                {displayStatus.apiStatus}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>System Information</Text>
        <div className={styles.infoRows}>
          {[
            ['Version', displayStatus.version],
            ['Database Version', displayStatus.dbVersion],
            ['Server Region', displayStatus.serverRegion],
            ['Last Backup', displayStatus.lastBackup],
            ['Uptime', displayStatus.uptime],
          ].map(([label, value], idx, arr) => (
            <div key={label} className={`${styles.infoRow} ${idx === arr.length - 1 ? styles.infoRowLast : ''}`}>
              <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
              <Text strong style={{ fontSize: 13, color: label === 'Uptime' ? '#16a34a' : '#111827' }}>
                {value}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── Main Settings Component ─────────────────────────────────────────────────
const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { key: 'general', icon: <SettingOutlined />, label: 'General', children: <GeneralTab /> },
    { key: 'notifications', icon: <BellOutlined />, label: 'Notifications', children: <NotificationsTab /> },
    { key: 'security', icon: <LockOutlined />, label: 'Security', children: <SecurityTab /> },
    { key: 'system', icon: <DatabaseOutlined />, label: 'System', children: <SystemTab /> },
  ];

  const activeContent = tabs.find((t) => t.key === activeTab)?.children;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <Text className={styles.pageTitle}>Settings</Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Manage your system preferences and configuration
        </Text>
      </div>

      {/* Segmented tab bar */}
      <div className={styles.segmentedNav}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.segmentedTab} ${activeTab === tab.key ? styles.segmentedTabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>{activeContent}</div>
    </div>
  );
};

export default Settings;