import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Typography, App } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { updateDisasterReportStatus } from '../../../services';
import type { DisasterReport } from '../../../types';

const { Text } = Typography;

const MIN_NOTES_LENGTH = 5;

interface ResolveDisasterModalProps {
  open: boolean;
  report: DisasterReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ResolveDisasterModal: React.FC<ResolveDisasterModalProps> = ({ open, report, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  if (!report) return null;

  const trimmedNotes = notes.trim();
  const isTooShort = trimmedNotes.length > 0 && trimmedNotes.length < MIN_NOTES_LENGTH;
  const isValid = trimmedNotes.length >= MIN_NOTES_LENGTH;

  const handleResolve = async () => {
    if (!trimmedNotes) {
      message.warning('Please enter resolution notes before resolving.');
      return;
    }
    if (!isValid) {
      message.warning(`Resolution notes must be at least ${MIN_NOTES_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await updateDisasterReportStatus(report.id, trimmedNotes);
      if (response.success) {
        message.success(`${report.reportId} has been marked as resolved.`);
        onSuccess();
        onClose();
      } else {
        message.error(response.message || 'Failed to resolve disaster');
      }
    } catch {
      message.error('Failed to resolve disaster');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlined style={{ color: '#059669', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
              Mark as Resolved
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
              This action cannot be undone
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      destroyOnClose
    >
      <div style={{ paddingTop: 8 }}>

        {/* Disaster info card */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{report.reportId}</Text>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: report.severity === 'critical' ? '#fef2f2' : report.severity === 'high' ? '#fff7ed' : '#fffbeb',
              color: report.severity === 'critical' ? '#dc2626' : report.severity === 'high' ? '#ea580c' : '#d97706',
              textTransform: 'uppercase',
            }}>
              {report.severity}
            </span>
          </div>
          <Text style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 6 }}>
            {report.title}
          </Text>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', gap: 16 }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>📍 {report.location}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>🕐 {report.time}</Text>
          </div>
        </div>

        {/* Resolution notes */}
        <div style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 10, fontWeight: 600, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
          }}>
            Resolution Notes <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
          </Text>
          <Input.TextArea
            placeholder="e.g. Situation contained, all units returned to base..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={300}
            showCount
            status={isTooShort ? 'error' : undefined}
            style={{ borderRadius: 8, fontSize: 13 }}
          />
          {isTooShort && (
            <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
              Minimum {MIN_NOTES_LENGTH} characters required ({MIN_NOTES_LENGTH - trimmedNotes.length} more needed)
            </Text>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}
        >
          Cancel
        </Button>
        <Button
          loading={submitting}
          onClick={handleResolve}
          disabled={!isValid || submitting}
          style={{
            height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 600, fontSize: 12, flex: 1,
            background: isValid ? '#059669' : '#d1fae5', borderColor: isValid ? '#059669' : '#d1fae5', color: '#fff',
          }}
        >
          Resolve Disaster
        </Button>
      </div>
    </Modal>
  );
};

export default ResolveDisasterModal;