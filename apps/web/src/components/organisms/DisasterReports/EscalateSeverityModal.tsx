// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Radio,
  Checkbox,
  Input,
  Button,
  Tag,
  Space,
  Typography,
  Alert,
  message,
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { DisasterReport, SeverityLevel } from '../../../types';
import { escalateDisasterSeverity } from '../../../services';

const { TextArea } = Input;
const { Text } = Typography;

const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bg: string; description: string }
> = {
  critical: {
    label: 'Critical',
    color: '#dc2626',
    bg: '#fef2f2',
    description: 'Immediate threat to life. All available resources required.',
  },
  high: {
    label: 'High',
    color: '#ea580c',
    bg: '#fff7ed',
    description: 'Serious incident. Significant resources and rapid response needed.',
  },
  medium: {
    label: 'Medium',
    color: '#d97706',
    bg: '#fffbeb',
    description: 'Moderate impact. Standard response procedures apply.',
  },
  low: {
    label: 'Low',
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Minor incident. Minimal resources required.',
  },
};

const SEVERITY_ORDER: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

const NOTIFY_OPTIONS = [
  { label: 'All active response teams', value: 'teams' },
  { label: 'Emergency Operations Centre', value: 'eoc' },
  { label: 'Regional Manager', value: 'manager' },
  { label: 'Send public alert (if applicable)', value: 'public' },
];

interface EscalateSeverityModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EscalateSeverityModal: React.FC<EscalateSeverityModalProps> = ({
  open,
  report,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | null>(null);
  const [reason, setReason] = useState('');
  const [notifyOptions, setNotifyOptions] = useState<string[]>(['teams', 'eoc']);
  const [submitting, setSubmitting] = useState(false);

  // Compute which severity levels can be selected (only escalation — no de-escalation here)
  const currentSeverityIndex = report ? SEVERITY_ORDER.indexOf(report.severity) : -1;
  const selectableSeverities = SEVERITY_ORDER.filter(
    (_, idx) => idx > currentSeverityIndex
  );

  const handleReset = () => {
    setStep(1);
    setSelectedSeverity(null);
    setReason('');
    setNotifyOptions(['teams', 'eoc']);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleNext = () => {
    if (!selectedSeverity) {
      message.warning('Please select a new severity level');
      return;
    }
    if (!reason.trim()) {
      message.warning('Please provide a reason for escalation');
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!report || !selectedSeverity) return;
    setSubmitting(true);
    try {
      const result = await escalateDisasterSeverity(report.id, selectedSeverity);
      if (result.success) {
        message.success(`Severity escalated to ${SEVERITY_CONFIG[selectedSeverity].label}`);
        onSuccess();
        handleClose();
      } else {
        message.error(result.message || 'Failed to escalate severity');
      }
    } catch {
      message.error('Failed to escalate severity');
    } finally {
      setSubmitting(false);
    }
  };

  if (!report) return null;

  const currentConfig = SEVERITY_CONFIG[report.severity];
  const newConfig = selectedSeverity ? SEVERITY_CONFIG[selectedSeverity] : null;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#dc2626' }} />
          <span>Escalate Priority</span>
          <Tag color="default" style={{ fontWeight: 400, marginLeft: 4 }}>
            {report.reportId}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      {/* Step indicator */}
      <div className="escalate-steps">
        <div className={`escalate-step ${step >= 1 ? 'active' : ''}`}>
          <span className="escalate-step-dot">{step > 1 ? '✓' : '1'}</span>
          <span>Select Severity</span>
        </div>
        <div className="escalate-step-line" />
        <div className={`escalate-step ${step >= 2 ? 'active' : ''}`}>
          <span className="escalate-step-dot">2</span>
          <span>Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <div className="escalate-step1">
          {/* Current severity */}
          <div className="escalate-current">
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              Current Severity
            </Text>
            <Tag
              style={{
                color: currentConfig.color,
                background: currentConfig.bg,
                border: `1px solid ${currentConfig.color}40`,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {currentConfig.label}
            </Tag>
          </div>

          {/* New severity selection */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
              Escalate To
            </Text>
            {selectableSeverities.length === 0 ? (
              <Alert
                message="This report is already at the highest severity level (Critical)."
                type="info"
                showIcon
              />
            ) : (
              <Radio.Group
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {selectableSeverities.map((sev) => {
                    const cfg = SEVERITY_CONFIG[sev];
                    return (
                      <Radio key={sev} value={sev} className="escalate-radio-option">
                        <div className="escalate-radio-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <WarningOutlined style={{ color: cfg.color }} />
                            <Text strong style={{ color: cfg.color }}>
                              {cfg.label}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 22 }}>
                            {cfg.description}
                          </Text>
                        </div>
                      </Radio>
                    );
                  })}
                </Space>
              </Radio.Group>
            )}
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              Reason for Escalation <span style={{ color: '#dc2626' }}>*</span>
            </Text>
            <TextArea
              rows={3}
              placeholder="Describe what has changed to require escalation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              showCount
            />
          </div>

          {/* Notifications */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              <BellOutlined style={{ marginRight: 6, color: '#6b7280' }} />
              Notify
            </Text>
            <Checkbox.Group
              value={notifyOptions}
              onChange={(vals) => setNotifyOptions(vals as string[])}
            >
              <Space direction="vertical" size={6}>
                {NOTIFY_OPTIONS.map((opt) => (
                  <Checkbox key={opt.value} value={opt.value}>
                    <Text style={{ fontSize: 13 }}>{opt.label}</Text>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        </div>
      )}

      {step === 2 && newConfig && (
        <div className="escalate-step2">
          <Alert
            message={
              <span>
                You are about to escalate <strong>{report.reportId}</strong> from{' '}
                <span style={{ color: currentConfig.color, fontWeight: 600 }}>
                  {currentConfig.label}
                </span>{' '}
                to{' '}
                <span style={{ color: newConfig.color, fontWeight: 600 }}>
                  {newConfig.label}
                </span>
              </span>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div className="escalate-summary">
            <div className="escalate-summary-row">
              <Text type="secondary">Location</Text>
              <Text>{report.location}</Text>
            </div>
            <div className="escalate-summary-row">
              <Text type="secondary">New Severity</Text>
              <Tag style={{ color: newConfig.color, background: newConfig.bg, border: `1px solid ${newConfig.color}40`, fontWeight: 600 }}>
                {newConfig.label}
              </Tag>
            </div>
            <div className="escalate-summary-row">
              <Text type="secondary">Reason</Text>
              <Text style={{ maxWidth: 220, textAlign: 'right' }}>{reason}</Text>
            </div>
            <div className="escalate-summary-row">
              <Text type="secondary">Notifications</Text>
              <Text>{notifyOptions.length} group{notifyOptions.length !== 1 ? 's' : ''}</Text>
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
            This action will be logged and cannot be undone without an administrator override.
          </Text>
        </div>
      )}

      {/* Footer */}
      <div className="escalate-footer">
        <Button onClick={handleClose}>Cancel</Button>
        <Space>
          {step === 2 && (
            <Button onClick={() => setStep(1)}>Back</Button>
          )}
          {step === 1 ? (
            <Button
              type="primary"
              danger
              onClick={handleNext}
              disabled={selectableSeverities.length === 0}
            >
              Review Escalation
            </Button>
          ) : (
            <Button
              type="primary"
              danger
              icon={<ExclamationCircleOutlined />}
              loading={submitting}
              onClick={handleConfirm}
            >
              Confirm Escalation
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default EscalateSeverityModal;
