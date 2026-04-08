// NEW FILE
import React, { useState, useEffect } from 'react';
import {
  App,
  Button,
  Input,
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
} from '@ant-design/icons';
import { changeAdminPassword, getSystemStatus } from '../../../services';
import { useNotifications } from '../../../context/NotificationContext';
import type { HealthResponse, HealthServiceStatus } from '../../../types';
import { ToggleRow } from '../../molecules';
import styles from './Settings.module.css';

const { Text } = Typography;

// ─── General Tab ─────────────────────────────────────────────────────────────
const GeneralTab: React.FC = () => {
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const fields = [
    { label: 'Full Name',    value: user.fullName    || '—' },
    { label: 'Email',        value: user.email        || '—' },
    { label: 'Phone Number', value: user.phoneNumber  || '—' },
    { label: 'Role',         value: user.role         || '—' },
    { label: 'Department',   value: user.department   || '—' },
    { label: 'Employee ID',  value: user.employeeId   || '—' },
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

// ─── Notifications Tab ────────────────────────────────────────────────────────
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

        <ToggleRow
          title="Live Notifications"
          description={
            socketEnabled
              ? connected ? 'Connected — receiving live events' : 'Connecting...'
              : 'Disconnected — no live events will be received'
          }
          checked={socketEnabled}
          onChange={toggleSocket}
        />

        <ToggleRow
          title="Notification Sound"
          description={soundEnabled ? 'Audio alert plays on new notifications' : 'Silent — no sound on notifications'}
          checked={soundEnabled}
          onChange={toggleSound}
          isLast
        />
      </Card>
    </div>
  );
};

// ─── Security Tab ─────────────────────────────────────────────────────────────
const SecurityTab: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields();
      const { currentPassword, newPassword } = values;
      setSaving(true);
      const res = await changeAdminPassword({ currentPassword, newPassword });
      if (res.success) {
        message.success('Password changed successfully');
        form.resetFields();
      } else {
        message.error(res.message || 'Failed to change password');
      }
    } catch {
      // validation error — antd handles display
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
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
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

const isOk = (status: string) => status === 'ok' || status === 'healthy';

const SERVICE_CONFIGS: {
  key: keyof HealthResponse['services'];
  label: string;
  icon: string;
}[] = [
  { key: 'postgresql', label: 'PostgreSQL',  icon: '🗄️' },
  { key: 'redis',      label: 'Redis Cache', icon: '⚡' },
  { key: 'rabbitmq',   label: 'RabbitMQ',   icon: '🐇' },
  { key: 'tomtom',     label: 'TomTom API', icon: '🗺️' },
];

// snake_case → "Title Case"
const toLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Coloured Yes / No pill for booleans
const BoolPill: React.FC<{ value: boolean }> = ({ value }) => (
  <span style={{
    fontSize: 11,
    fontWeight: 600,
    padding: '1px 8px',
    borderRadius: 20,
    background: value ? '#dcfce7' : '#fee2e2',
    color: value ? '#15803d' : '#dc2626',
  }}>
    {value ? 'Yes' : 'No'}
  </span>
);

// Renders every field from a service object except `status` (shown as the headline)
const ServiceDetails: React.FC<{ svc: HealthServiceStatus }> = ({ svc }) => {
  const entries = Object.entries(svc).filter(([key]) => key !== 'status');
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 11, minWidth: 120 }}>
            {toLabel(key)}
          </Text>
          {typeof value === 'boolean' ? (
            <BoolPill value={value} />
          ) : (
            <Text style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>
              {String(value)}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
};

const ServiceCard: React.FC<{
  cfg: typeof SERVICE_CONFIGS[number];
  svc: HealthServiceStatus;
}> = ({ cfg, svc }) => {
  const ok = isOk(svc.status);

  return (
    <div
      className={`${styles.statusCard} ${ok ? styles.statusCardGreen : styles.statusCardRed}`}
      style={{ alignItems: 'flex-start' }}
    >
      <div
        className={`${styles.statusIcon} ${ok ? styles.statusIconGreen : styles.statusIconRed}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0, marginTop: 2,
        }}
      >
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{cfg.label}</Text>
        <Text strong style={{
          fontSize: 15,
          display: 'block',
          color: ok ? '#15803d' : '#dc2626',
          textTransform: 'capitalize',
        }}>
          {svc.status}
        </Text>
        {/* Render every extra field the API returns for this service */}
        <ServiceDetails svc={svc} />
      </div>
    </div>
  );
};

const SystemTab: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSystemStatus();
      if (res.success && res.data) {
        setHealth(res.data);
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        setError(res.message ?? 'Unable to reach health endpoint.');
      }
    } catch {
      setError('Unable to reach health endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  if (loading) return <div className={styles.tabLoading}><Spin /></div>;

  const overallOk = health ? isOk(health.status) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Overall banner */}
      <Card className={styles.settingsCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: overallOk ? '#16a34a' : '#dc2626',
              boxShadow: overallOk
                ? '0 0 0 3px rgba(22,163,74,0.2)'
                : '0 0 0 3px rgba(220,38,38,0.2)',
            }} />
            <div>
              <Text strong style={{ fontSize: 15 }}>
                System {health ? (overallOk ? 'Operational' : 'Degraded') : 'Unavailable'}
              </Text>
              {lastChecked && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  Last checked at {lastChecked}
                </Text>
              )}
            </div>
          </div>
          <Button size="small" onClick={loadStatus}>Refresh</Button>
        </div>
      </Card>

      {/* Service cards */}
      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Service Status</Text>
        {health ? (
          <div className={styles.statusGrid}>
            {SERVICE_CONFIGS.map((cfg) => (
              <ServiceCard key={cfg.key} cfg={cfg} svc={health.services[cfg.key]} />
            ))}
          </div>
        ) : (
          <Text type="secondary">{error ?? 'No data available.'}</Text>
        )}
      </Card>

      {/* Server timestamp */}
      {health?.timestamp && (
        <Card className={styles.settingsCard}>
          <div className={styles.infoRows}>
            <div className={`${styles.infoRow} ${styles.infoRowLast}`}>
              <Text type="secondary" style={{ fontSize: 13 }}>Server Timestamp</Text>
              <Text strong style={{ fontSize: 13, color: '#111827' }}>
                {new Date(health.timestamp).toLocaleString()}
              </Text>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
};

// ─── Main Settings Component ──────────────────────────────────────────────────
const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { key: 'general',       icon: <SettingOutlined />,  label: 'General',       children: <GeneralTab /> },
    { key: 'notifications', icon: <BellOutlined />,     label: 'Notifications', children: <NotificationsTab /> },
    { key: 'security',      icon: <LockOutlined />,     label: 'Security',      children: <SecurityTab /> },
    { key: 'system',        icon: <DatabaseOutlined />, label: 'System',        children: <SystemTab /> },
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