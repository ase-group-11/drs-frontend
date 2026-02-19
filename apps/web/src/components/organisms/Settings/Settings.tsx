// NEW FILE
import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Switch,
  Tabs,
  Form,
  Typography,
  Card,
  Spin,
  message,
} from 'antd';
import {
  SettingOutlined,
  BellOutlined,
  LockOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  getGeneralSettings,
  saveGeneralSettings,
  getNotificationSettings,
  saveNotificationSettings,
  changePassword,
  getSystemStatus,
} from '../../../services';
import type {
  GeneralSettings,
  NotificationSettings,
  SystemStatus,
} from '../../../types';
import styles from './Settings.module.css';

const { Text } = Typography;

// ─── General Tab ────────────────────────────────────────────────────────────
const GeneralTab: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const res = await getGeneralSettings();
    if (res.data) {
      form.setFieldsValue(res.data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await saveGeneralSettings(values as GeneralSettings);
      if (res.success) message.success('Settings saved successfully');
      else message.error(res.message || 'Failed to save');
    } catch {
      // validation error
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.tabLoading}><Spin /></div>;

  return (
    <Card className={styles.settingsCard}>
      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20 }}>System Information</Text>
      <Form form={form} layout="vertical" requiredMark={false}>
        <div className={styles.fieldGrid2}>
          <Form.Item name="systemName" label="System Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="adminEmail" label="Admin Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
        </div>
        <div className={styles.fieldGrid3}>
          <Form.Item name="timezone" label="Timezone">
            <Select>
              <Select.Option value="europe-dublin">Europe/Dublin (GMT+0)</Select.Option>
              <Select.Option value="europe-london">Europe/London (GMT+0)</Select.Option>
              <Select.Option value="america-ny">America/New York (GMT-5)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="language" label="Language">
            <Select>
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="ga">Irish</Select.Option>
              <Select.Option value="fr">French</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateFormat" label="Date Format">
            <Select>
              <Select.Option value="dd-mm-yyyy">DD/MM/YYYY</Select.Option>
              <Select.Option value="mm-dd-yyyy">MM/DD/YYYY</Select.Option>
              <Select.Option value="yyyy-mm-dd">YYYY-MM-DD</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <div className={styles.formFooter}>
          <Button onClick={() => form.resetFields()}>Cancel</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Save Changes
          </Button>
        </div>
      </Form>
    </Card>
  );
};

// ─── Notifications Tab ───────────────────────────────────────────────────────
interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, checked, onChange, last }) => (
  <div className={`${styles.toggleRow} ${last ? styles.toggleRowLast : ''}`}>
    <div>
      <Text strong style={{ fontSize: 13, display: 'block' }}>{title}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
    </div>
    <Switch checked={checked} onChange={onChange} style={checked ? { background: '#7c3aed' } : {}} />
  </div>
);

const NotificationsTab: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    criticalAlerts: true,
    dailySummary: true,
    teamUpdates: false,
    systemMaintenance: true,
    desktopNotifications: true,
    soundAlerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const res = await getNotificationSettings();
    if (res.data) setSettings(res.data);
    setLoading(false);
  };

  const update = (key: keyof NotificationSettings) => (val: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const res = await saveNotificationSettings(settings);
    if (res.success) message.success('Notification settings saved');
    else message.error(res.message || 'Failed to save');
    setSaving(false);
  };

  if (loading) return <div className={styles.tabLoading}><Spin /></div>;

  return (
    <div className={styles.notifGrid}>
      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Email Notifications</Text>
        <ToggleRow title="Critical Alerts" description="Receive email for critical incidents" checked={settings.criticalAlerts} onChange={update('criticalAlerts')} />
        <ToggleRow title="Daily Summary" description="Daily report digest" checked={settings.dailySummary} onChange={update('dailySummary')} />
        <ToggleRow title="Team Updates" description="Team status changes" checked={settings.teamUpdates} onChange={update('teamUpdates')} />
        <ToggleRow title="System Maintenance" description="Scheduled maintenance alerts" checked={settings.systemMaintenance} onChange={update('systemMaintenance')} last />
      </Card>

      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Push Notifications</Text>
        <ToggleRow title="Desktop Notifications" description="Browser push notifications" checked={settings.desktopNotifications} onChange={update('desktopNotifications')} />
        <ToggleRow title="Sound Alerts" description="Audio alert for critical events" checked={settings.soundAlerts} onChange={update('soundAlerts')} last />
        <div className={styles.formFooter} style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 8 }}>
          <span />
          <Button
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── Security Tab ────────────────────────────────────────────────────────────
const SecurityTab: React.FC = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const getTeamMemberId = (): string | null => {
    // Adjust this to match how your app stores the logged-in user.
    // Common patterns:
    // - localStorage.getItem("teamMemberId")
    // - JSON.parse(localStorage.getItem("user")!).id
    // - auth store / context
    const raw = localStorage.getItem('teamMemberId');
    if (raw) return raw;

    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        return u?.teamMemberId ?? u?.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleChangePassword = async () => {
    try {
      const values = await form.validateFields();
      const { currentPassword, newPassword, confirmPassword } = values;

      if (newPassword !== confirmPassword) {
        message.error('New passwords do not match');
        return;
      }

      const teamMemberId = getTeamMemberId();
      if (!teamMemberId) {
        message.error('Unable to determine your account. Please sign in again.');
        return;
      }

      setSaving(true);

      const res = await changePassword({
        teamMemberId,
        oldPassword: currentPassword,
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
    <Card className={styles.settingsCard} style={{ maxWidth: 480 }}>
      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20 }}>
        Password & Authentication
      </Text>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="currentPassword"
          label="Current Password"
          rules={[{ required: true, message: 'Please enter your current password' }]}
        >
          <Input.Password placeholder="Enter current password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password placeholder="Enter new password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          rules={[{ required: true, message: 'Please confirm your password' }]}
        >
          <Input.Password placeholder="Confirm new password" />
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
    const res = await getSystemStatus();
    if (res.data) setStatus(res.data);
    setLoading(false);
  };

  if (loading) return <div className={styles.tabLoading}><Spin /></div>;
  if (!status) return null;

  const isOperational = status.databaseStatus === 'Operational';
  const isHealthy = status.apiStatus === 'Healthy';

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
                {status.databaseStatus}
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
                {status.apiStatus}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.settingsCard}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>System Information</Text>
        <div className={styles.infoRows}>
          {[
            ['Version', status.version],
            ['Database Version', status.dbVersion],
            ['Server Region', status.serverRegion],
            ['Last Backup', status.lastBackup],
            ['Uptime', status.uptime],
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
  const tabItems = [
    {
      key: 'general',
      label: (
        <span className={styles.tabLabel}>
          <SettingOutlined />
          <span>General</span>
        </span>
      ),
      children: <GeneralTab />,
    },
    {
      key: 'notifications',
      label: (
        <span className={styles.tabLabel}>
          <BellOutlined />
          <span>Notifications</span>
        </span>
      ),
      children: <NotificationsTab />,
    },
    {
      key: 'security',
      label: (
        <span className={styles.tabLabel}>
          <LockOutlined />
          <span>Security</span>
        </span>
      ),
      children: <SecurityTab />,
    },
    {
      key: 'system',
      label: (
        <span className={styles.tabLabel}>
          <DatabaseOutlined />
          <span>System</span>
        </span>
      ),
      children: <SystemTab />,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <Text className={styles.pageTitle}>Settings</Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Manage your system preferences and configuration
        </Text>
      </div>
      <Tabs items={tabItems} className={styles.mainTabs} />
    </div>
  );
};

export default Settings;
