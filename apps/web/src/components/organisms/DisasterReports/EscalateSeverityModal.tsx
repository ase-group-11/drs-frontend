import React, { useState } from 'react';
import {
  Modal,
  Input,
  Button,
  Typography,
  message,
} from 'antd';
import {
  WarningOutlined,
  DownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { DisasterReport, SeverityLevel } from '../../../types';
import { escalateDisasterSeverity } from '../../../services';

const { TextArea } = Input;
const { Text } = Typography;

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; bg: string; border: string; description: string }> = {
  low: {
    label: 'Low Priority',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'Minor incident. Minimal resources required.',
  },
  medium: {
    label: 'Medium Priority',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    description: 'Moderate impact. Standard response procedures apply.',
  },
  high: {
    label: 'High Priority',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    description: 'Requires immediate additional resources',
  },
  critical: {
    label: 'Critical Emergency',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    description: 'Maximum response protocol initiated',
  },
};

const SEVERITY_ORDER: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

const AUTO_ACTIONS = [
  'Notify Emergency Coordinators',
  'Request Additional Units',
  'Alert Nearby Zones',
];

interface EscalateSeverityModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EscalateSeverityModal: React.FC<EscalateSeverityModalProps> = ({
  open, report, onClose, onSuccess,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoActions, setAutoActions] = useState<string[]>([
    'Notify Emergency Coordinators',
    'Request Additional Units',
    'Alert Nearby Zones',
  ]);

  const toggleAction = (action: string) =>
    setAutoActions((prev) => prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]);

  const handleClose = () => {
    setSelectedSeverity(null);
    setReason('');
    onClose();
  };

  const handleEscalate = async () => {
    if (!selectedSeverity) { message.warning('Please select a severity level'); return; }
    if (!reason.trim()) { message.warning('Please provide a reason for escalation'); return; }
    if (!report) return;
    setSubmitting(true);
    try {
      const result = await escalateDisasterSeverity(report.id, selectedSeverity);
      if (result.success) {
        message.success(`Severity escalated to ${SEVERITY_CONFIG[selectedSeverity].label}`);
        onSuccess(); handleClose();
      } else {
        message.error(result.message || 'Failed to escalate severity');
      }
    } catch { message.error('Failed to escalate severity'); }
    finally { setSubmitting(false); }
  };

  if (!report) return null;

  const severity = report.severity as SeverityLevel;
  const currentIdx = SEVERITY_ORDER.indexOf(severity);
  const escalatableLevels = SEVERITY_ORDER.filter((_, i) => i > currentIdx);
  const currentCfg = SEVERITY_CONFIG[severity];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      destroyOnClose
      title={null}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: '#fff7ed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <WarningOutlined style={{ color: '#ea580c', fontSize: 20 }} />
        </div>
        <div>
          <Text strong style={{ fontSize: 18, color: '#111827', display: 'block' }}>
            Escalate Disaster Severity
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>
            Increase priority for <span style={{ color: '#111827', fontWeight: 600 }}>{report.reportId}</span>
          </Text>
        </div>
      </div>

      {/* Current severity summary card */}
      <div style={{
        background: '#f9fafb', borderRadius: 12, padding: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, marginBottom: 20,
      }}>
        <span style={{
          background: currentCfg.bg, color: currentCfg.color,
          border: `1px solid ${currentCfg.border}`,
          borderRadius: 999, padding: '5px 16px', fontSize: 13, fontWeight: 600,
        }}>
          {currentCfg.label}
        </span>
        <DownOutlined style={{ color: '#9ca3af', fontSize: 14 }} />
        <Text style={{ fontSize: 13, color: '#9ca3af' }}>Will be escalated to:</Text>
      </div>

      {/* Severity option cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {escalatableLevels.length === 0 ? (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px' }}>
            <Text style={{ color: '#2563eb', fontSize: 13 }}>
              ℹ️ This report is already at the highest severity level (Critical).
            </Text>
          </div>
        ) : (
          escalatableLevels.map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const isSelected = selectedSeverity === sev;
            return (
              <div
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                style={{
                  border: `1.5px solid ${isSelected ? cfg.color : '#e5e7eb'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  background: isSelected ? cfg.bg : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 15, color: isSelected ? cfg.color : '#111827', display: 'block', marginBottom: 2 }}>
                    {cfg.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>{cfg.description}</Text>
                </div>
                {isSelected && (
                  <CheckCircleOutlined style={{ color: cfg.color, fontSize: 20, flexShrink: 0 }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14, color: '#111827' }}>Reason for Escalation</Text>
          <span style={{ color: '#dc2626' }}>*</span>
        </div>
        <TextArea
          placeholder="Explain why severity needs to be increased..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, resize: 'none' }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          {reason.length}/500
        </div>
      </div>

      {/* Automatic Actions */}
      <div style={{
        background: '#f0f4ff', borderRadius: 12, padding: '16px', marginBottom: 24,
      }}>
        <Text strong style={{ fontSize: 14, color: '#111827', display: 'block', marginBottom: 12 }}>
          Automatic Actions
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AUTO_ACTIONS.map((action) => {
            const checked = autoActions.includes(action);
            return (
              <div key={action} onClick={() => toggleAction(action)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  background: checked ? '#6b7280' : '#fff',
                  border: `2px solid ${checked ? '#6b7280' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {checked && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <Text style={{ fontSize: 13, color: '#374151', userSelect: 'none' }}>{action}</Text>
              </div>
            );
          })}
          {selectedSeverity === 'critical' && (() => {
            const checked = autoActions.includes('Initiate Evacuation Protocol');
            return (
              <div
                onClick={() => toggleAction('Initiate Evacuation Protocol')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  background: '#fef2f2', borderRadius: 8,
                  margin: '2px -16px -16px -16px', padding: '10px 16px 12px 16px',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  background: checked ? '#6b7280' : '#fff',
                  border: `2px solid ${checked ? '#6b7280' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {checked && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: 500, userSelect: 'none' }}>Initiate Evacuation Protocol</Text>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button onClick={handleClose} style={{ borderRadius: 10, height: 42, padding: '0 20px' }}>
          Cancel
        </Button>
        <Button
          loading={submitting}
          onClick={handleEscalate}
          disabled={escalatableLevels.length === 0}
          style={{
            borderRadius: 10, height: 42, padding: '0 22px', fontWeight: 600,
            background: selectedSeverity ? SEVERITY_CONFIG[selectedSeverity].color : escalatableLevels.length === 0 ? '#d1d5db' : '#ea580c',
            borderColor: selectedSeverity ? SEVERITY_CONFIG[selectedSeverity].color : escalatableLevels.length === 0 ? '#d1d5db' : '#ea580c',
            color: '#fff',
          }}
        >
          Escalate Severity
        </Button>
      </div>
    </Modal>
  );
};

export default EscalateSeverityModal;