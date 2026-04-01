import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Input, Radio, Space, message } from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  StopOutlined,
  TeamOutlined,
  CopyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { deleteUser } from '../../../services';
import type { AdminUser } from '../../../types';

const { Text } = Typography;

const REASON_OPTIONS = [
  { value: 'Account no longer needed',   label: 'Account No Longer Needed',  icon: <ClockCircleOutlined /> },
  { value: 'Policy violation',           label: 'Policy Violation',           icon: <StopOutlined /> },
  { value: 'User left the organisation', label: 'Left the Organisation',      icon: <TeamOutlined /> },
  { value: 'Duplicate account',          label: 'Duplicate Account',          icon: <CopyOutlined /> },
  { value: 'other',                      label: 'Other',                      icon: <FileTextOutlined /> },
];

interface DeleteUserModalProps {
  open: boolean;
  // Single user delete
  user?: AdminUser | null;
  // Bulk delete
  users?: AdminUser[];
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ open, user, users, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isBulk = !!users && users.length > 0;
  const targets = isBulk ? users! : user ? [user] : [];

  useEffect(() => {
    if (open) { setReason(''); setOtherReason(''); }
  }, [open]);

  if (targets.length === 0) return null;

  const canDelete = reason !== '' && (reason !== 'other' || otherReason.trim().length > 0);
  const finalReason = reason === 'other' ? (otherReason.trim() || 'Other') : reason;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        targets.map((u) => deleteUser(u.id, finalReason))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled' && (r as any).value.success).length;
      const failed    = targets.length - succeeded;
      if (succeeded) message.success(`${succeeded} user${succeeded > 1 ? 's' : ''} deleted`);
      if (failed)    message.error(`${failed} deletion${failed > 1 ? 's' : ''} failed`);
      onSuccess();
      onClose();
    } catch {
      message.error('Failed to delete user(s)');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WarningOutlined style={{ color: '#e11d48', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
              {isBulk ? `Delete ${targets.length} Users` : 'Delete User'}
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

        {/* User info card */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          {isBulk ? (
            <div>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 6 }}>
                {targets.length} users selected for deletion
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 100, overflowY: 'auto' }}>
                {targets.map((u) => (
                  <Text key={u.id} style={{ fontSize: 12, color: '#6b7280' }}>• {u.fullName} ({u.email})</Text>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ fontSize: 15, fontWeight: 700, color: '#111827', display: 'block' }}>
                    {targets[0].fullName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>
                    {targets[0].userType === 'citizen'
                      ? 'Citizen'
                      : targets[0].role.charAt(0) + targets[0].role.slice(1).toLowerCase()}
                    {targets[0].department ? ` · ${targets[0].department.charAt(0) + targets[0].department.slice(1).toLowerCase()}` : ''}
                  </Text>
                </div>
                {targets[0].employeeId && (
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{targets[0].employeeId}</Text>
                )}
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>{targets[0].email}</Text>
              </div>
            </>
          )}
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 12, color: '#dc2626', display: 'block', marginBottom: 8 }}>
            Reason for Deletion <span style={{ color: '#dc2626' }}>*</span>
          </Text>
          <Radio.Group value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {REASON_OPTIONS.map(({ value, label, icon }) => (
                <Radio key={value} value={value}>
                  <Space size={6}>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>{icon}</span>
                    <Text style={{ fontSize: 12 }}>{label}</Text>
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          {reason === 'other' && (
            <Input
              placeholder="Specify reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              style={{ marginTop: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, height: 34, fontSize: 12 }}
            />
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button
          onClick={onClose}
          disabled={deleting}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}
        >
          Cancel
        </Button>
        <Button
          disabled={!canDelete}
          loading={deleting}
          onClick={handleDelete}
          style={{
            height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 600, fontSize: 12, flex: 1,
            background: canDelete ? '#dc2626' : undefined,
            borderColor: canDelete ? '#dc2626' : undefined,
            color: canDelete ? '#fff' : undefined,
          }}
        >
          {isBulk ? `Delete ${targets.length} Users` : 'Delete User'}
        </Button>
      </div>

      <style>{`
        .ant-radio-checked .ant-radio-inner { background-color: #dc2626 !important; border-color: #dc2626 !important; }
        .ant-radio:hover .ant-radio-inner { border-color: #dc2626 !important; }
      `}</style>
    </Modal>
  );
};

export default DeleteUserModal;