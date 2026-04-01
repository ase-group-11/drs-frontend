import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Input, Typography, message, Divider } from 'antd';
import { EditOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import type { AdminUser, ApiUserStatus } from '../../../types';
import { friendlyApiError } from '../../../utils';

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
  activelyDeployed?: boolean;
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
  open, user, onClose, onSuccess, activelyDeployed = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ApiUserStatus>('ACTIVE');
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    if (open && user) {
      setSelectedStatus(user.status);
      setFullName(user.fullName ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
      setErrors({});
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

    const newErrors: { fullName?: string; email?: string; phone?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s\-().]{7,20}$/.test(phone.trim())) {
      newErrors.phone = 'Enter a valid phone number (e.g. +91 98765 43210)';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

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
      message.error(friendlyApiError(err, 'Failed to update user'));
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
              <Text style={labelStyle}>Full Name <span style={{ color: '#ef4444' }}>*</span></Text>
              <Input
                prefix={<UserOutlined style={{ color: errors.fullName ? '#ef4444' : '#9ca3af', fontSize: 13 }} />}
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: undefined })); }}
                placeholder="Full name"
                size="large"
                status={errors.fullName ? 'error' : ''}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
              {errors.fullName && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.fullName}</div>}
            </div>

            <div>
              <Text style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></Text>
              <Input
                prefix={<MailOutlined style={{ color: errors.email ? '#ef4444' : '#9ca3af', fontSize: 13 }} />}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="email@example.com"
                type="email"
                size="large"
                status={errors.email ? 'error' : ''}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
              {errors.email && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.email}</div>}
            </div>

            <div>
              <Text style={labelStyle}>Phone Number <span style={{ color: '#ef4444' }}>*</span></Text>
              <Input
                prefix={<PhoneOutlined style={{ color: errors.phone ? '#ef4444' : '#9ca3af', fontSize: 13 }} />}
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })); }}
                placeholder="+91 XXXXX XXXXX"
                size="large"
                status={errors.phone ? 'error' : ''}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
              {errors.phone && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{errors.phone}</div>}
            </div>

          </div>
        </div>

        <Divider style={{ margin: '2px 0' }} />

        {/* Status section */}
        <div>
          <Text style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 12 }}>
            Account Status
          </Text>

          {(user.commandingUnitsCount ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)', marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <Text style={{ fontSize: 12, color: '#92400e' }}>
                Commanding {user.commandingUnitsCount} unit{(user.commandingUnitsCount ?? 0) > 1 ? 's' : ''} ({user.currentUnitCodes?.join(', ')}). Status cannot be changed.
              </Text>
            </div>
          )}

          {activelyDeployed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>🚨</span>
              <Text style={{ fontSize: 12, color: '#b91c1c' }}>
                Unit {user.currentUnitCodes?.join(', ')} is currently deployed. Status cannot be changed until the mission is complete.
              </Text>
            </div>
          )}

          <div>
            <Text style={labelStyle}>Status</Text>
            <Select
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val as ApiUserStatus)}
              disabled={(user.commandingUnitsCount ?? 0) > 0 || activelyDeployed}
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