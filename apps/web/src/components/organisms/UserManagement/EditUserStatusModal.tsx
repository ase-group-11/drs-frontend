import React, { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Modal, Button, Select, Input, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { updateUserStatus } from '../../../services';
import type { AdminUser, ApiUserStatus } from '../../../types';

const { Text } = Typography;

const STATUS_OPTIONS: {
  value: ApiUserStatus;
  label: string;
  color: string;
}[] = [
  { value: 'ACTIVE',    label: 'Active',    color: '#008236' },
  { value: 'INACTIVE',  label: 'Inactive',  color: '#6b7280' },
  { value: 'SUSPENDED', label: 'Suspended', color: '#d4183d' },
];

interface EditUserStatusModalProps {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserStatusModal: React.FC<EditUserStatusModalProps> = ({
  open, user, onClose, onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ApiUserStatus>('ACTIVE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelectedStatus(user.status);
      setReason('');
    }
  }, [open, user]);

  if (!user) return null;

  const hasChanged = selectedStatus !== user.status;
  const currentCfg = STATUS_OPTIONS.find((o) => o.value === user.status);
  const selectedCfg = STATUS_OPTIONS.find((o) => o.value === selectedStatus)!;

  const handleSubmit = async () => {
    if (!hasChanged) { onClose(); return; }
    setSubmitting(true);
    try {
      const result = await updateUserStatus(user.id, { status: selectedStatus, reason: reason.trim() || undefined });
      if (result.success) {
        message.success(`${user.fullName}'s status updated to ${selectedCfg.label}`);
        onSuccess();
        onClose();
      } else {
        message.error(result.message || 'Failed to update status');
      }
    } catch {
      message.error('Failed to update status');
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
            background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EditOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
              Edit User Status
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
              {user.fullName}
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
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Current status */}
        <div>
          <Text style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            Current Status
          </Text>
          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: currentCfg?.color ?? '#6b7280', flexShrink: 0,
            }} />
            <Text style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
              {currentCfg?.label ?? user.status}
            </Text>
          </div>
        </div>

        {/* New status dropdown */}
        <div>
          <Text style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            New Status
          </Text>
          <Select
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val as ApiUserStatus)}
            style={{ width: '100%' }}
            size="large"
            optionLabelProp="label"
            popupClassName="um-filter-dropdown"
          >
            {STATUS_OPTIONS.map((opt) => (
              <Select.Option key={opt.value} value={opt.value} label={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0, display: 'inline-block' }} />
                  {opt.label}
                </span>
              }>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0, display: 'inline-block' }} />
                  <Text style={{ fontSize: 13, color: opt.color, fontWeight: 500 }}>{opt.label}</Text>
                </div>
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Reason */}
        <div>
          <Text style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            Reason <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </Text>
          <Input.TextArea
            placeholder="e.g. Account verified, Policy violation, User request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={200}
            showCount
            style={{ borderRadius: 8, fontSize: 13 }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Button onClick={onClose} style={{ borderRadius: 8, height: 38, padding: '0 20px' }}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!hasChanged}
            style={{
              borderRadius: 8, height: 38, padding: '0 20px', fontWeight: 600,
              background: hasChanged ? '#7c3aed' : undefined,
              borderColor: hasChanged ? '#7c3aed' : undefined,
            }}
          >
            Update Status
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserStatusModal;