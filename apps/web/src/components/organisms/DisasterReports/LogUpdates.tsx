import React, { useState } from 'react';
import { Button, Card, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  PaperClipOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ArrowRightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { DisasterReport } from '../../../types';
import './LogUpdates.css';

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
  const [entries] = useState<LogEntry[]>(DUMMY_TIMELINE);

  const filteredEntries = entries;

  return (
    <div className="log-container">
      {/* Header */}
      <div className="log-header">
        <div className="log-title-row">
          <div className="log-title-left">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} className="log-back-btn" />
            <div>
              <h1 className="log-title">Disaster Logs</h1>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Report {report.reportId} · Activity History
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Card className="log-timeline-card" style={{ margin: '0 24px 24px' }}>
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
  );
};

export default LogUpdates;