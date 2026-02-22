import React, { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Checkbox,
  Typography,
  Space,
  message,
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
  ArrowRightOutlined,
  CalendarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import './LogUpdates.css';

const { TextArea } = Input;
const { Text } = Typography;

const DUMMY_TIMELINE = [
  {
    id: 1,
    type: 'critical' as const,
    title: 'Evacuation Order Issued',
    description: 'Evacuation order for Zone A issued. Alert sent to 1,234 residents.',
    timestamp: '14:45',
    user: 'System',
    isCritical: true,
    attachments: 0,
    severityChange: null as null | { from: string; to: string },
  },
  {
    id: 2,
    type: 'system' as const,
    title: 'Units Arrived on Scene',
    description: 'Fire Unit F-12 confirms arrival. Commencing containment operations.',
    timestamp: '14:35',
    user: 'System',
    isCritical: false,
    attachments: 0,
    severityChange: null,
  },
  {
    id: 3,
    type: 'admin' as const,
    title: 'Dispatch Confirmed',
    description: '3 Units dispatched to location via fastest route. ETAs: 5-7 minutes.',
    timestamp: '14:20',
    user: 'Admin User',
    isCritical: false,
    attachments: 1,
    severityChange: null,
  },
  {
    id: 4,
    type: 'critical' as const,
    title: 'Severity Upgraded',
    description: 'Report escalated from High to Critical based on visual evidence.',
    timestamp: '14:15',
    user: 'Admin User',
    isCritical: true,
    attachments: 2,
    severityChange: { from: 'High', to: 'Critical' },
  },
  {
    id: 5,
    type: 'user' as const,
    title: 'Report Received',
    description: 'Initial report submitted by citizen via mobile app. Photo evidence attached.',
    timestamp: '14:10',
    user: 'Sarah Connor',
    isCritical: false,
    attachments: 2,
    severityChange: null,
  },
];

type TimelineEntryType = 'critical' | 'system' | 'admin' | 'user';
type UpdateType = 'status_change' | 'general_note' | 'resource_request' | 'public_alert' | 'casualty_update' | 'unit_arrival' | 'situation_report' | 'evacuation_notice';
type FilterTab = 'all' | 'system' | 'admin' | 'user';
type Priority = 'standard' | 'important' | 'critical';
type Visibility = 'internal' | 'public';

const ENTRY_TYPE_CONFIG: Record<TimelineEntryType, { color: string; bg: string; dotColor: string; label: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', dotColor: '#fecaca', label: 'Critical' },
  system:   { color: '#2563eb', bg: '#eff6ff', dotColor: '#bfdbfe', label: 'System' },
  admin:    { color: '#7c3aed', bg: '#f5f3ff', dotColor: '#ddd6fe', label: 'Admin' },
  user:     { color: '#059669', bg: '#f0fdf4', dotColor: '#a7f3d0', label: 'User' },
};

interface LogEntry {
  id: number;
  type: TimelineEntryType;
  title: string;
  description: string;
  timestamp: string;
  user: string;
  isCritical: boolean;
  attachments: number;
  severityChange: null | { from: string; to: string };
}

interface LogUpdatesProps {
  report: DisasterReport;
  onBack: () => void;
}

const LogUpdates: React.FC<LogUpdatesProps> = ({ report, onBack }) => {
  const [entries, setEntries] = useState<LogEntry[]>(DUMMY_TIMELINE);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [dateFilter, setDateFilter] = useState('last7');

  // Form state
  const [newType, setNewType] = useState<UpdateType>('status_change');
  const [priority, setPriority] = useState<Priority>('standard');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [notifyCoordinators, setNotifyCoordinators] = useState(false);
  const [alertZones, setAlertZones] = useState(false);
  const [publicAnnouncement, setPublicAnnouncement] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('internal');
  const [submitting, setSubmitting] = useState(false);

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Updates' },
    { key: 'system', label: 'System Events' },
    { key: 'admin', label: 'Admin Actions' },
    { key: 'user', label: 'User Reports' },
  ];

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchText ||
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesTab = activeTab === 'all' || e.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const handlePost = async () => {
    if (!newDescription.trim()) {
      message.warning('Please enter a description');
      return;
    }
    setSubmitting(true);
    try {
      const newEntry: LogEntry = {
        id: Date.now(),
        type: priority === 'critical' ? 'critical' : 'admin',
        title: newTitle || 'Update',
        description: newDescription,
        timestamp: new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }),
        user: 'Admin User',
        isCritical: priority === 'critical',
        attachments: 0,
        severityChange: null,
      };
      setEntries((prev) => [newEntry, ...prev]);
      message.success('Update posted successfully');
      setNewTitle('');
      setNewDescription('');
      setPriority('standard');
      setNotifyCoordinators(false);
      setAlertZones(false);
      setPublicAnnouncement(false);
    } finally {
      setSubmitting(false);
    }
  };

  const criticalCount = entries.filter((e) => e.isCritical).length;

  return (
    <div className="log-container">
      {/* Header */}
      <div className="log-header">
        <div className="log-title-row">
          <div className="log-title-left">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} className="log-back-btn" />
            <div>
              <h1 className="log-title">Update Log</h1>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Report {report.reportId} · Activity History
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="log-filter-bar" size="small">
        <div className="log-filter-inner">
          <div className="log-filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`log-tab-btn ${activeTab === tab.key ? 'log-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="log-filter-right">
            <Select
              value={dateFilter}
              onChange={setDateFilter}
              style={{ width: 130 }}
              suffixIcon={<CalendarOutlined />}
            >
              <Select.Option value="today">Today</Select.Option>
              <Select.Option value="last7">Last 7 Days</Select.Option>
              <Select.Option value="last30">Last 30 Days</Select.Option>
              <Select.Option value="all">All Time</Select.Option>
            </Select>
            <Input
              placeholder="Search timeline..."
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Button icon={<DownloadOutlined />} onClick={() => message.info('Exporting...')}>
              Export
            </Button>
          </div>
        </div>
      </Card>

      <div className="log-layout">
        {/* Timeline column */}
        <div className="log-timeline-col">
          <Card className="log-timeline-card">
            <div className="log-timeline-card-header">
              <Text strong style={{ fontSize: 15, color: '#111827' }}>Incident Timeline</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>({filteredEntries.length} entries)</Text>
            </div>

            <div className="log-timeline">
              {filteredEntries.map((entry, idx) => {
                const cfg = ENTRY_TYPE_CONFIG[entry.type];
                return (
                  <div key={entry.id} className="log-entry">
                    {/* Dot + connector */}
                    <div className="log-entry-line-col">
                      <div className="log-entry-dot" style={{ background: cfg.dotColor, border: `2px solid ${cfg.color}` }} />
                      {idx < filteredEntries.length - 1 && <div className="log-entry-connector" />}
                    </div>

                    {/* Card */}
                    <div
                      className={`log-entry-card ${entry.isCritical ? 'log-entry-critical' : ''}`}
                      style={entry.isCritical ? { borderLeft: `3px solid ${cfg.color}`, background: cfg.bg } : {}}
                    >
                      <div className="log-entry-header">
                        <div className="log-entry-title-group">
                          {entry.isCritical && (
                            entry.severityChange
                              ? <WarningOutlined style={{ color: cfg.color, fontSize: 14 }} />
                              : <ExclamationCircleOutlined style={{ color: cfg.color, fontSize: 14 }} />
                          )}
                          {entry.severityChange && (
                            <ArrowRightOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                          )}
                          <Text strong style={{ fontSize: 13, color: '#111827' }}>{entry.title}</Text>
                        </div>
                        <div className="log-entry-meta-right">
                          <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{entry.timestamp}</Text>
                        </div>
                      </div>

                      <Text style={{ fontSize: 13, color: '#6b7280', display: 'block', margin: '6px 0' }}>
                        {entry.description}
                      </Text>

                      {/* Severity change pills */}
                      {entry.severityChange && (
                        <div className="log-severity-change">
                          <span className="log-severity-pill log-severity-high">{entry.severityChange.from}</span>
                          <ArrowRightOutlined style={{ color: '#6b7280', fontSize: 11 }} />
                          <span className="log-severity-pill log-severity-critical">{entry.severityChange.to}</span>
                        </div>
                      )}

                      <div className="log-entry-footer">
                        <div className="log-entry-footer-left">
                          <span className="log-entry-author">
                            <UserOutlined style={{ color: '#9ca3af', fontSize: 11, marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{entry.user}</Text>
                          </span>
                          <span
                            className="log-type-tag"
                            style={{ background: cfg.dotColor, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          {entry.attachments > 0 && (
                            <span className="log-entry-author">
                              <PaperClipOutlined style={{ color: '#9ca3af', fontSize: 11, marginRight: 4 }} />
                              <Text style={{ fontSize: 12, color: '#9ca3af' }}>{entry.attachments} files</Text>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="log-right-col">
          {/* Log New Update */}
          <Card className="log-new-entry-card">
            <Text strong style={{ fontSize: 16, color: '#111827', display: 'block', marginBottom: 20 }}>
              Log New Update
            </Text>

            {/* Update Type */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Update Type</Text>
              <Select value={newType} onChange={setNewType} style={{ width: '100%', marginTop: 8 }}>
                <Select.Option value="status_change">Status Change</Select.Option>
                <Select.Option value="general_note">General Note</Select.Option>
                <Select.Option value="resource_request">Resource Request</Select.Option>
                <Select.Option value="public_alert">Public Alert</Select.Option>
                <Select.Option value="casualty_update">Casualty Update</Select.Option>
                <Select.Option value="unit_arrival">Unit Arrival</Select.Option>
                <Select.Option value="situation_report">Situation Report</Select.Option>
                <Select.Option value="evacuation_notice">Evacuation Notice</Select.Option>
              </Select>
            </div>

            {/* Priority Level */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Priority Level</Text>
              <div className="log-priority-group">
                {(['standard', 'important', 'critical'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    className={`log-priority-btn ${priority === p ? 'log-priority-active' : ''}`}
                    onClick={() => setPriority(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Update Title <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text></Text>
              <Input
                placeholder="Brief title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ marginTop: 8 }}
                maxLength={80}
              />
            </div>

            {/* Description */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Description <span style={{ color: '#dc2626' }}>*</span></Text>
              <TextArea
                placeholder="Enter details about this update..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
                maxLength={500}
                style={{ marginTop: 8, resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {newDescription.length}/500
              </div>
            </div>

            {/* Attachments */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Attachments <Text type="secondary" style={{ fontWeight: 400 }}>(optional)</Text></Text>
              <Upload beforeUpload={() => false} showUploadList={false}>
                <div className="log-attach-zone">
                  <PaperClipOutlined style={{ fontSize: 20, color: '#9ca3af', marginBottom: 6 }} />
                  <Text style={{ fontSize: 13, color: '#374151' }}>Attach files</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Images, PDFs, up to 5MB</Text>
                </div>
              </Upload>
            </div>

            {/* Notifications */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Notifications</Text>
              <div className="log-checkboxes">
                <Checkbox checked={notifyCoordinators} onChange={(e) => setNotifyCoordinators(e.target.checked)}>
                  <Text style={{ fontSize: 13 }}>Notify emergency coordinators</Text>
                </Checkbox>
                <Checkbox checked={alertZones} onChange={(e) => setAlertZones(e.target.checked)}>
                  <Text style={{ fontSize: 13 }}>Alert affected zones</Text>
                </Checkbox>
                <Checkbox checked={publicAnnouncement} onChange={(e) => setPublicAnnouncement(e.target.checked)}>
                  <Text style={{ fontSize: 13 }}>Public announcement</Text>
                </Checkbox>
              </div>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                Selected groups will receive immediate notification
              </Text>
            </div>

            {/* Visibility */}
            <div className="log-form-field">
              <Text strong style={{ fontSize: 13, color: '#111827' }}>Visibility</Text>
              <div className="log-visibility-group">
                <button
                  className={`log-visibility-btn ${visibility === 'internal' ? 'log-visibility-active' : ''}`}
                  onClick={() => setVisibility('internal')}
                >
                  Internal (team only)
                </button>
                <button
                  className={`log-visibility-btn ${visibility === 'public' ? 'log-visibility-active' : ''}`}
                  onClick={() => setVisibility('public')}
                >
                  Public
                </button>
              </div>
            </div>

            {/* Actions */}
            <Button
              type="primary"
              block
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handlePost}
              style={{ background: '#7c3aed', borderColor: '#7c3aed', height: 44, fontSize: 14, fontWeight: 600, borderRadius: 10, marginTop: 8 }}
            >
              Post Update
            </Button>
            <Button
              block
              icon={<SaveOutlined />}
              style={{ height: 44, marginTop: 10, borderRadius: 10, fontSize: 14 }}
              onClick={() => message.info('Saved as draft')}
            >
              Save as Draft
            </Button>

            {/* Quick Stats */}
            <div className="log-quick-stats">
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>
                QUICK STATS
              </Text>
              <div className="log-stats-grid">
                <div>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{entries.length} Total Updates</Text>
                </div>
                <div>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>{criticalCount} Critical</Text>
                </div>
                <div>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Last: 2 mins ago</Text>
                </div>
                <div>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>{entries.filter(e => e.timestamp.startsWith('14')).length} Today</Text>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogUpdates;