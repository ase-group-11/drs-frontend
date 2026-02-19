// NEW FILE
import React, { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Checkbox,
  Typography,
  Tag,
  Space,
  Tooltip,
  message,
  Badge,
  Divider,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SearchOutlined,
  PaperClipOutlined,
  SendOutlined,
  SaveOutlined,
  BellOutlined,
  RocketOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  UserOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import './LogUpdates.css';

const { TextArea } = Input;
const { Text } = Typography;

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_TIMELINE = [
  {
    id: 1,
    type: 'critical' as const,
    title: 'Evacuation Order Issued',
    description: 'Evacuation order for Zone A issued. Alert sent to 1,234 residents via emergency broadcast.',
    time: '2 mins ago',
    timestamp: '14:45',
    user: 'System',
    isCritical: true,
    attachments: 0,
  },
  {
    id: 2,
    type: 'system' as const,
    title: 'Units Arrived on Scene',
    description: 'Fire Unit F-12 confirms arrival. Commencing containment operations.',
    time: '10 mins ago',
    timestamp: '14:35',
    user: 'System',
    isCritical: false,
    attachments: 0,
  },
  {
    id: 3,
    type: 'admin' as const,
    title: 'Dispatch Confirmed',
    description: '3 Units dispatched to location via fastest route. ETAs: 5–7 minutes.',
    time: '25 mins ago',
    timestamp: '14:20',
    user: 'Admin User',
    isCritical: false,
    attachments: 1,
  },
  {
    id: 4,
    type: 'critical' as const,
    title: 'Severity Upgraded',
    description: 'Report escalated from High to Critical based on visual evidence submitted by field team.',
    time: '30 mins ago',
    timestamp: '14:15',
    user: 'Admin User',
    isCritical: true,
    attachments: 2,
  },
  {
    id: 5,
    type: 'user' as const,
    title: 'Initial Report Filed',
    description: 'Disaster report submitted via mobile app. Location GPS coordinates attached.',
    time: '45 mins ago',
    timestamp: '14:00',
    user: 'John Murphy',
    isCritical: false,
    attachments: 3,
  },
];

type TimelineEntryType = 'critical' | 'system' | 'admin' | 'user';
type UpdateType = 'status_update' | 'resource_update' | 'situation_report' | 'action_taken';

const ENTRY_TYPE_CONFIG: Record<
  TimelineEntryType,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  critical: {
    color: '#dc2626',
    bg: '#fef2f2',
    icon: <ExclamationCircleOutlined />,
    label: 'Critical Alert',
  },
  system: {
    color: '#2563eb',
    bg: '#eff6ff',
    icon: <InfoCircleOutlined />,
    label: 'System',
  },
  admin: {
    color: '#7c3aed',
    bg: '#f5f3ff',
    icon: <UserOutlined />,
    label: 'Admin',
  },
  user: {
    color: '#059669',
    bg: '#f0fdf4',
    icon: <CheckCircleOutlined />,
    label: 'Field Report',
  },
};

interface LogEntry {
  id: number;
  type: TimelineEntryType;
  title: string;
  description: string;
  time: string;
  timestamp: string;
  user: string;
  isCritical: boolean;
  attachments: number;
}

interface LogUpdatesProps {
  report: DisasterReport;
  onBack: () => void;
}

const LogUpdates: React.FC<LogUpdatesProps> = ({ report, onBack }) => {
  const [entries, setEntries] = useState<LogEntry[]>(DUMMY_TIMELINE);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // New entry form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<UpdateType>('status_update');
  const [notifyTeams, setNotifyTeams] = useState(false);
  const [notifyEOC, setNotifyEOC] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchText ||
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmitUpdate = async () => {
    if (!newTitle.trim()) {
      message.warning('Please enter a title for the update');
      return;
    }
    if (!newDescription.trim()) {
      message.warning('Please enter a description');
      return;
    }

    setSubmitting(true);
    try {
      // Wire to API: POST /api/admin/disaster-reports/:id/logs
      const newEntry: LogEntry = {
        id: Date.now(),
        type: isCritical ? 'critical' : 'admin',
        title: newTitle,
        description: newDescription,
        time: 'Just now',
        timestamp: new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }),
        user: 'Admin User',
        isCritical,
        attachments: 0,
      };
      setEntries((prev) => [newEntry, ...prev]);
      message.success('Update logged successfully');
      setNewTitle('');
      setNewDescription('');
      setIsCritical(false);
      setNotifyTeams(false);
      setNotifyEOC(false);
    } catch {
      message.error('Failed to log update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    message.info('Exporting log...');
  };

  return (
    <div className="log-container">
      {/* Header */}
      <div className="log-header">
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={onBack}
          className="log-back-btn"
        >
          Back to Reports
        </Button>

        <div className="log-title-row">
          <div>
            <h1 className="log-title">Activity Log</h1>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {report.reportId} · {report.location}
            </Text>
          </div>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export Log
          </Button>
        </div>
      </div>

      <div className="log-layout">
        {/* Timeline column */}
        <div className="log-timeline-col">
          {/* Filters */}
          <Card className="log-filter-card" size="small">
            <Space style={{ width: '100%' }} size={10} wrap>
              <Input
                placeholder="Search log..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 140 }}
              >
                <Select.Option value="all">All Types</Select.Option>
                <Select.Option value="critical">Critical</Select.Option>
                <Select.Option value="system">System</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
                <Select.Option value="user">Field Report</Select.Option>
              </Select>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {filteredEntries.length} entries
              </Text>
            </Space>
          </Card>

          {/* Timeline entries */}
          <div className="log-timeline">
            {filteredEntries.map((entry, idx) => {
              const cfg = ENTRY_TYPE_CONFIG[entry.type];
              return (
                <div key={entry.id} className="log-entry">
                  {/* Line connector */}
                  <div className="log-entry-line-col">
                    <div
                      className="log-entry-dot"
                      style={{
                        background: cfg.bg,
                        border: `2px solid ${cfg.color}`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.icon}
                    </div>
                    {idx < filteredEntries.length - 1 && <div className="log-entry-connector" />}
                  </div>

                  {/* Content */}
                  <Card
                    className={`log-entry-card ${entry.isCritical ? 'log-entry-critical' : ''}`}
                    size="small"
                    style={
                      entry.isCritical
                        ? { borderLeft: `3px solid ${cfg.color}`, borderColor: cfg.color }
                        : {}
                    }
                  >
                    <div className="log-entry-header">
                      <div className="log-entry-title-group">
                        <Text strong style={{ fontSize: 13 }}>
                          {entry.title}
                        </Text>
                        {entry.isCritical && (
                          <Tag
                            style={{
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.color}40`,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            CRITICAL
                          </Tag>
                        )}
                      </div>
                      <div className="log-entry-meta-right">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {entry.timestamp} · {entry.time}
                        </Text>
                        <Button type="text" size="small" icon={<MoreOutlined />} />
                      </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', margin: '6px 0' }}>
                      {entry.description}
                    </Text>
                    <div className="log-entry-footer">
                      <Space size={12}>
                        <span className="log-entry-author">
                          <UserOutlined style={{ marginRight: 4, color: '#9ca3af' }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {entry.user}
                          </Text>
                        </span>
                        {entry.attachments > 0 && (
                          <span>
                            <PaperClipOutlined style={{ marginRight: 4, color: '#9ca3af' }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {entry.attachments} attachment{entry.attachments > 1 ? 's' : ''}
                            </Text>
                          </span>
                        )}
                      </Space>
                      <Tag
                        style={{
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.color}30`,
                          fontSize: 10,
                        }}
                      >
                        {cfg.label}
                      </Tag>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: new update form + quick actions */}
        <div className="log-right-col">
          {/* New Update Form */}
          <Card className="log-new-entry-card" title="Log New Update">
            <div className="log-form">
              <div className="log-form-row">
                <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                  Update Type
                </Text>
                <Select
                  value={newType}
                  onChange={setNewType}
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Select.Option value="status_update">Status Update</Select.Option>
                  <Select.Option value="resource_update">Resource Update</Select.Option>
                  <Select.Option value="situation_report">Situation Report</Select.Option>
                  <Select.Option value="action_taken">Action Taken</Select.Option>
                </Select>
              </div>

              <div className="log-form-row">
                <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                  Title
                </Text>
                <Input
                  placeholder="Brief title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  size="small"
                  maxLength={80}
                />
              </div>

              <div className="log-form-row">
                <Text strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                  Details
                </Text>
                <TextArea
                  placeholder="Describe the update, actions taken, or current situation..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  maxLength={600}
                  showCount
                />
              </div>

              <div className="log-form-row">
                <Upload beforeUpload={() => false} showUploadList={false}>
                  <Button size="small" icon={<PaperClipOutlined />}>
                    Attach File
                  </Button>
                </Upload>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div className="log-form-row">
                <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                  <BellOutlined style={{ marginRight: 4 }} />
                  Notify
                </Text>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Checkbox
                    checked={notifyTeams}
                    onChange={(e) => setNotifyTeams(e.target.checked)}
                  >
                    <Text style={{ fontSize: 12 }}>Response teams on scene</Text>
                  </Checkbox>
                  <Checkbox
                    checked={notifyEOC}
                    onChange={(e) => setNotifyEOC(e.target.checked)}
                  >
                    <Text style={{ fontSize: 12 }}>Emergency Operations Centre</Text>
                  </Checkbox>
                  <Checkbox
                    checked={isCritical}
                    onChange={(e) => setIsCritical(e.target.checked)}
                  >
                    <Text style={{ fontSize: 12, color: '#dc2626' }}>
                      Mark as critical
                    </Text>
                  </Checkbox>
                </Space>
              </div>

              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 8 }} size={8}>
                <Button size="small" icon={<SaveOutlined />}>
                  Save Draft
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={handleSubmitUpdate}
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  Post Update
                </Button>
              </Space>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="log-quick-actions-card" title="Quick Actions" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button block icon={<BellOutlined />} size="small" danger>
                Send Emergency Alert
              </Button>
              <Button
                block
                icon={<RocketOutlined />}
                size="small"
                style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
              >
                Dispatch Additional Units
              </Button>
              <Button block icon={<EnvironmentOutlined />} size="small">
                Update Location Pin
              </Button>
              <Button block icon={<TeamOutlined />} size="small">
                Notify All Teams
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogUpdates;
