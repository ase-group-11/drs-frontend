import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  AlertOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import type { DisasterReport } from '../../../types';
import './LogUpdates.css';

const { Text } = Typography;

// ── API shape ────────────────────────────────────────────────────────────────
interface TimelineEntry {
  event_type: string;
  title: string;
  actor: string;
  badge: string;
  time: string;
  timestamp: string;
}

interface TimelineResponse {
  disaster_id: string;
  tracking_id: string;
  total_entries: number;
  entries: TimelineEntry[];
}

// ── Event type → visual config ───────────────────────────────────────────────
type BadgeType = 'System' | 'Admin' | 'Citizen' | string;

const BADGE_CONFIG: Record<string, { color: string; bg: string; dotColor: string }> = {
  System:   { color: '#2563eb', bg: '#eff6ff', dotColor: '#bfdbfe' },
  Admin:    { color: '#7c3aed', bg: '#f5f3ff', dotColor: '#ddd6fe' },
  Citizen:  { color: '#059669', bg: '#f0fdf4', dotColor: '#a7f3d0' },
  Operator: { color: '#d97706', bg: '#fffbeb', dotColor: '#fde68a' },
  Authority:{ color: '#dc2626', bg: '#fef2f2', dotColor: '#fecaca' },
};

const EVENT_DESCRIPTION: Record<string, string> = {
  DISASTER_REPORTED:    'A new disaster report was submitted and logged into the system.',
  RESPONSE_STARTED:     'Emergency response operations have been initiated for this incident.',
  UNITS_DEPLOYED:       'Emergency units were dispatched to the incident location.',
  UNITS_ARRIVED:        'Deployed units have arrived on scene and commenced operations.',
  BACKUP_REQUESTED:     'Additional backup units have been requested for this incident.',
  MISSION_COMPLETED:    'The assigned mission has been completed successfully.',
  REROUTE_TRIGGERED:    'Traffic rerouting has been triggered due to road blockages near the disaster.',
  OPERATOR_OVERRIDE:    'An operator has manually overridden the system reroute assignment.',
  TRAFFIC_RESTORED:     'Traffic flow has been restored to normal in the affected area.',
  EVACUATION_CREATED:   'An evacuation plan has been created for the affected area.',
  EVACUATION_APPROVED:  'The evacuation plan has been reviewed and approved by authorities.',
  EVACUATION_ACTIVATED: 'The evacuation order is now active. Residents are being notified.',
  DISASTER_RESOLVED:    'The disaster has been marked as resolved. All units are standing down.',
  SEVERITY_ESCALATED:   'The severity level of this disaster has been escalated.',
  STATUS_CHANGED:       'The status of this disaster report was updated.',
};

const EVENT_ICON: Record<string, React.ReactNode> = {
  DISASTER_REPORTED:    <AlertOutlined style={{ fontSize: 13 }} />,
  RESPONSE_STARTED:     <InfoCircleOutlined style={{ fontSize: 13 }} />,
  UNITS_DEPLOYED:       <TeamOutlined style={{ fontSize: 13 }} />,
  UNITS_ARRIVED:        <TeamOutlined style={{ fontSize: 13 }} />,
  BACKUP_REQUESTED:     <WarningOutlined style={{ fontSize: 13 }} />,
  MISSION_COMPLETED:    <CheckCircleOutlined style={{ fontSize: 13 }} />,
  REROUTE_TRIGGERED:    <InfoCircleOutlined style={{ fontSize: 13 }} />,
  OPERATOR_OVERRIDE:    <WarningOutlined style={{ fontSize: 13 }} />,
  TRAFFIC_RESTORED:     <CheckCircleOutlined style={{ fontSize: 13 }} />,
  EVACUATION_CREATED:   <InfoCircleOutlined style={{ fontSize: 13 }} />,
  EVACUATION_APPROVED:  <CheckCircleOutlined style={{ fontSize: 13 }} />,
  EVACUATION_ACTIVATED: <AlertOutlined style={{ fontSize: 13 }} />,
  DISASTER_RESOLVED:    <CheckCircleOutlined style={{ fontSize: 13 }} />,
  SEVERITY_ESCALATED:   <WarningOutlined style={{ fontSize: 13 }} />,
  STATUS_CHANGED:       <InfoCircleOutlined style={{ fontSize: 13 }} />,
};

const CRITICAL_EVENTS = new Set([
  'DISASTER_REPORTED', 'SEVERITY_ESCALATED', 'BACKUP_REQUESTED',
  'EVACUATION_ACTIVATED', 'OPERATOR_OVERRIDE',
]);

const getBadgeCfg = (badge: BadgeType) =>
  BADGE_CONFIG[badge] ?? { color: '#6b7280', bg: '#f9fafb', dotColor: '#e5e7eb' };

// ── Component ─────────────────────────────────────────────────────────────────
interface LogUpdatesProps {
  report: DisasterReport;
  onBack: () => void;
}

const LogUpdates: React.FC<LogUpdatesProps> = ({ report, onBack }) => {
  const [entries, setEntries]   = useState<TimelineEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<TimelineResponse>(
          API_ENDPOINTS.ADMIN.DISASTER_TIMELINE(report.id)
        );
        setEntries(res.data?.entries ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [report.id]);

  return (
    <div className="log-container">
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
          {!loading && !error && (
            <Text type="secondary" style={{ fontSize: 13 }}>({entries.length} entries)</Text>
          )}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        )}

        {!loading && error && (
          <Empty description="Failed to load timeline" style={{ padding: '40px 0' }} />
        )}

        {!loading && !error && entries.length === 0 && (
          <Empty description="No activity recorded yet" style={{ padding: '40px 0' }} />
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="log-timeline">
            {entries.map((entry, idx) => {
              const cfg        = getBadgeCfg(entry.badge);
              const isCritical = CRITICAL_EVENTS.has(entry.event_type);
              const icon       = EVENT_ICON[entry.event_type] ?? <ExclamationCircleOutlined style={{ fontSize: 13 }} />;
              const dateLabel  = new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div key={`${entry.event_type}-${idx}`} className="log-entry">
                  {/* Timeline dot + connector */}
                  <div className="log-entry-line-col">
                    <div className="log-entry-dot" style={{ background: cfg.dotColor, border: `2px solid ${cfg.color}` }} />
                    {idx < entries.length - 1 && <div className="log-entry-connector" />}
                  </div>

                  {/* Entry card */}
                  <div
                    className={`log-entry-card ${isCritical ? 'log-entry-critical' : ''}`}
                    style={isCritical ? { borderLeft: `3px solid ${cfg.color}`, background: cfg.bg } : {}}
                  >
                    <div className="log-entry-header">
                      <div className="log-entry-title-group">
                        <span style={{ color: cfg.color }}>{icon}</span>
                        <Text strong style={{ fontSize: 13, color: '#111827' }}>{entry.title}</Text>
                      </div>
                      <div className="log-entry-meta-right">
                        <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{entry.time} · {dateLabel}</Text>
                      </div>
                    </div>

                    <Text style={{ fontSize: 13, color: '#6b7280', display: 'block', margin: '6px 0 8px' }}>
                      {EVENT_DESCRIPTION[entry.event_type] ?? `${entry.title} was recorded for this incident.`}
                    </Text>

                    <div className="log-entry-footer" style={{ marginTop: 0 }}>
                      <div className="log-entry-footer-left">
                        <span
                          className="log-type-tag"
                          style={{ background: cfg.dotColor, color: cfg.color }}
                        >
                          {entry.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default LogUpdates;