import React, { useState } from 'react';
import { Modal, Input, Button, Typography, message } from 'antd';
import { WarningOutlined, DownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { DisasterReport, SeverityLevel } from '../../../types';
import { escalateDisasterSeverity } from '../../../services';

const { TextArea } = Input;
const { Text } = Typography;

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; bg: string; border: string; description: string }> = {
  low:      { label: 'Low Priority',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', description: 'Minor incident. Minimal resources required.' },
  medium:   { label: 'Medium Priority',    color: '#d97706', bg: '#fffbeb', border: '#fde68a', description: 'Moderate impact. Standard response procedures apply.' },
  high:     { label: 'High Priority',      color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', description: 'Requires immediate additional resources' },
  critical: { label: 'Critical Emergency', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', description: 'Maximum response protocol initiated' },
};

const SEVERITY_ORDER: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

interface EscalateSeverityModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EscalateSeverityModal: React.FC<EscalateSeverityModalProps> = ({ open, report, onClose, onSuccess }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => { setSelectedSeverity(null); setReason(''); onClose(); };

  const handleEscalate = async () => {
    if (!selectedSeverity) { message.warning('Please select a severity level'); return; }
    if (!reason.trim()) { message.warning('Please provide a reason for escalation'); return; }
    if (!report) return;
    setSubmitting(true);
    try {
      const result = await escalateDisasterSeverity(report.id, selectedSeverity.toUpperCase(), reason.trim());
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
  const currentCfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.low;

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={420}
      destroyOnClose title={null}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      {/* Scrollable body */}
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningOutlined style={{ color: '#ea580c', fontSize: 16 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 15, color: '#111827', display: 'block' }}>
              Escalate Disaster Severity
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              Increase priority for <span style={{ color: '#111827', fontWeight: 600 }}>{report.reportId}</span>
            </Text>
          </div>
        </div>

        {/* Current → escalated summary */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ background: currentCfg.bg, color: currentCfg.color, border: `1px solid ${currentCfg.border}`, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
            {currentCfg.label}
          </span>
          <DownOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>Will be escalated to:</Text>
        </div>

        {/* Severity options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {escalatableLevels.length === 0 ? (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
              <Text style={{ color: '#2563eb', fontSize: 12 }}>
                ℹ️ This report is already at the highest severity level (Critical).
              </Text>
            </div>
          ) : (
            escalatableLevels.map((sev) => {
              const cfg = SEVERITY_CONFIG[sev];
              const isSelected = selectedSeverity === sev;
              return (
                <div key={sev} onClick={() => setSelectedSeverity(sev)}
                  style={{
                    border: `1.5px solid ${isSelected ? cfg.color : '#e5e7eb'}`,
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    background: isSelected ? cfg.bg : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                  }}>
                  <div>
                    <Text strong style={{ fontSize: 13, color: isSelected ? cfg.color : '#111827', display: 'block', marginBottom: 1 }}>
                      {cfg.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>{cfg.description}</Text>
                  </div>
                  {isSelected && <CheckCircleOutlined style={{ color: cfg.color, fontSize: 16, flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Text strong style={{ fontSize: 12, color: '#111827' }}>Reason for Escalation</Text>
            <span style={{ color: '#dc2626', fontSize: 12 }}>*</span>
          </div>
          <TextArea
            placeholder="Explain why severity needs to be increased..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, resize: 'none', fontSize: 12 }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {reason.length}/500
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button loading={submitting} onClick={handleEscalate}
          disabled={escalatableLevels.length === 0}
          style={{
            height: 36, paddingInline: 20, borderRadius: 6, fontWeight: 600, fontSize: 12,
            background: selectedSeverity ? SEVERITY_CONFIG[selectedSeverity].color : escalatableLevels.length === 0 ? '#d1d5db' : '#ea580c',
            borderColor: selectedSeverity ? SEVERITY_CONFIG[selectedSeverity].color : escalatableLevels.length === 0 ? '#d1d5db' : '#ea580c',
            color: '#fff', flex: 1,
          }}>
          Escalate Severity
        </Button>
      </div>
    </Modal>
  );
};

export default EscalateSeverityModal;