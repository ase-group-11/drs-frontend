import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Input, Typography, message, Divider } from 'antd';
import { EditOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
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
  { value: 'PENDING',   label: 'Pending',   color: '#d97706' },
  { value: 'DELETED',   label: 'Deleted',   color: '#374151' },
];

interface EditUserStatusModalProps {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

const EditUserStatusModal: React.FC<EditUserStatusModalProps> = ({
  open, user, onClose, onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ApiUserStatus>('ACTIVE');
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelectedStatus(user.status);
      setFullName(user.fullName ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
    }
  }, [open, user]);

  if (!user) return null;

  const statusChanged  = selectedStatus !== user.status;
  const profileChanged =
    fullName.trim() !== (user.fullName ?? '').trim() ||
    email.trim()    !== (user.email ?? '').trim()    ||
    phone.trim()    !== (user.phone ?? '').trim();

  const hasChanged = statusChanged || profileChanged;

  const handleSubmit = async () => {
    if (!hasChanged) { onClose(); return; }

    if (!fullName.trim()) {
      message.warning('Full name cannot be empty');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      message.warning('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        status:       selectedStatus,
        full_name:    fullName.trim(),
        email:        email.trim(),
        phone_number: phone.trim(),
      };

      await apiClient.put(API_ENDPOINTS.USER_MANAGEMENT.UPDATE(user.id), payload);
      message.success(`${fullName.trim()} updated successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to update user');
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
              Edit User
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
      width={460}
      destroyOnClose
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Profile fields */}
        <div>
          <Text style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 12 }}>
            Profile Information
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div>
              <Text style={labelStyle}>Full Name</Text>
              <Input
                prefix={<UserOutlined style={{ color: '#9ca3af', fontSize: 13 }} />}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                size="large"
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>

            <div>
              <Text style={labelStyle}>Email</Text>
              <Input
                prefix={<MailOutlined style={{ color: '#9ca3af', fontSize: 13 }} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                size="large"
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>

            <div>
              <Text style={labelStyle}>Phone Number</Text>
              <Input
                prefix={<PhoneOutlined style={{ color: '#9ca3af', fontSize: 13 }} />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                size="large"
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>

          </div>
        </div>

        <Divider style={{ margin: '2px 0' }} />

        {/* Status section */}
        <div>
          <Text style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 12 }}>
            Account Status
          </Text>

          <div>
            <Text style={labelStyle}>Status</Text>
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
            Save Changes
          </Button>
        </div>

      </div>
    </Modal>
  );
};

export default EditUserStatusModal;