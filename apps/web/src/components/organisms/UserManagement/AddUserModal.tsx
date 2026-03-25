import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Typography, message } from 'antd';
import {
  UserAddOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { createUser } from '../../../services';

const { Text } = Typography;

const USER_TYPE_OPTIONS = [
  { value: 'citizen', label: 'Citizen',     icon: <UserOutlined /> },
  { value: 'team',    label: 'Team Member', icon: <TeamOutlined /> },
];

const ROLE_OPTIONS   = ['ADMIN', 'STAFF'];
const DEPT_OPTIONS   = ['FIRE', 'MEDICAL', 'POLICE', 'IT'];

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY = { fullName: '', email: '', phone: '', password: '', role: '', department: '', employeeId: '' };

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onClose, onSuccess }) => {
  const [userType, setUserType] = useState<'citizen' | 'team'>('citizen');
  const [form, setForm]         = useState({ ...EMPTY });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setUserType('citizen'); setForm({ ...EMPTY }); setErrors({}); }
  }, [open]);

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.fullName.trim()) {
      e.fullName = 'Full name is required';
    } else if (form.fullName.trim().length < 2) {
      e.fullName = 'Full name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address';
    }

    if (!form.phone.trim()) {
      e.phone = 'Phone number is required';
    } else {
      const digits = form.phone.replace(/[\s\-()]/g, '');
      const irish  = digits.replace(/^\+353/, '');
      const indian = digits.replace(/^\+91/, '');
      const isIrish  = /^8\d{8}$/.test(irish);
      const isIndian = /^[6-9]\d{9}$/.test(indian);
      if (!isIrish && !isIndian) {
        e.phone = 'Enter a valid Irish (+353 8X XXX XXXX) or Indian (+91 XXXXXXXXXX) number';
      }
    }

    if (userType === 'team') {
      if (!form.password.trim()) {
        e.password = 'Password is required';
      } else if (form.password.length < 8) {
        e.password = 'Password must be at least 8 characters';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(form.password)) {
        e.password = 'Must contain uppercase, lowercase, number and special char (@$!%*?&)';
      }
      if (!form.role)       e.role       = 'Role is required';
      if (!form.department) e.department = 'Department is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        user_type:    userType,
        full_name:    form.fullName.trim(),
        email:        form.email.trim(),
        phone_number: form.phone.trim(),
      };
      if (userType === 'team') {
        payload.password   = form.password;
        payload.role       = form.role;
        payload.department = form.department;
        if (form.employeeId.trim()) payload.employee_id = form.employeeId.trim();
      }
      const result = await createUser(payload);
      if (result.success) {
        message.success(`${form.fullName} has been added successfully`);
        onSuccess();
        onClose();
      } else {
        message.error(result.message || 'Failed to create user');
      }
    } catch {
      message.error('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    borderRadius: 8,
    fontSize: 13,
    borderColor: errors[field] ? '#e11d48' : undefined,
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    display: 'block', marginBottom: 5,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 11, color: '#e11d48', marginTop: 3, display: 'block',
  };

  const req = <span style={{ color: '#e11d48', marginLeft: 2 }}>*</span>;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserAddOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>Add New User</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>Create a citizen or team member account</div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      destroyOnClose
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* User type toggle */}
        <div>
          <Text style={labelStyle}>Account Type</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            {USER_TYPE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                onClick={() => { setUserType(opt.value as 'citizen' | 'team'); setErrors({}); }}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${userType === opt.value ? '#7c3aed' : '#e5e7eb'}`,
                  background: userType === opt.value ? '#f5f3ff' : '#fff',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ color: userType === opt.value ? '#7c3aed' : '#6b7280', fontSize: 14 }}>{opt.icon}</span>
                <Text style={{ fontSize: 13, fontWeight: 600, color: userType === opt.value ? '#7c3aed' : '#374151' }}>{opt.label}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Shared fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={labelStyle}>Full Name{req}</Text>
            <Input
              placeholder="e.g. John Murphy"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              style={inputStyle('fullName')}
            />
            {errors.fullName && <Text style={errorStyle}>{errors.fullName}</Text>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Text style={labelStyle}>Email{req}</Text>
              <Input
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                style={inputStyle('email')}
              />
              {errors.email && <Text style={errorStyle}>{errors.email}</Text>}
            </div>
            <div style={{ flex: 1 }}>
              <Text style={labelStyle}>Phone Number{req}</Text>
              <Input
                placeholder="+353 87 123 4567"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                style={inputStyle('phone')}
              />
              {errors.phone && <Text style={errorStyle}>{errors.phone}</Text>}
            </div>
          </div>
        </div>

        {/* Team-only fields */}
        {userType === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
              <Text style={{ ...labelStyle, color: '#7c3aed' }}>Team Member Details</Text>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Text style={labelStyle}>Role{req}</Text>
                <Select
                  placeholder="Select role"
                  value={form.role || undefined}
                  onChange={(v) => { set('role', v); set('department', ''); }}
                  style={{ width: '100%', borderRadius: 8 }}
                  status={errors.role ? 'error' : undefined}
                  popupClassName="um-filter-dropdown"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <Select.Option key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </Select.Option>
                  ))}
                </Select>
                {errors.role && <Text style={errorStyle}>{errors.role}</Text>}
              </div>
              <div style={{ flex: 1 }}>
                <Text style={labelStyle}>Department{req}</Text>
                <Select
                  placeholder="Select department"
                  value={form.department || undefined}
                  onChange={(v) => set('department', v)}
                  style={{ width: '100%' }}
                  status={errors.department ? 'error' : undefined}
                  popupClassName="um-filter-dropdown"
                  disabled={!form.role}
                >
                  {(form.role === 'ADMIN' ? ['IT'] : ['FIRE', 'MEDICAL', 'POLICE']).map((d) => (
                    <Select.Option key={d} value={d}>
                      {d === 'IT' ? 'IT' : d.charAt(0) + d.slice(1).toLowerCase()}
                    </Select.Option>
                  ))}
                </Select>
                {errors.department && <Text style={errorStyle}>{errors.department}</Text>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Text style={labelStyle}>Password{req}</Text>
                <Input.Password
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  style={inputStyle('password')}
                />
                {errors.password && <Text style={errorStyle}>{errors.password}</Text>}
              </div>
              <div style={{ flex: 1 }}>
                <Text style={labelStyle}>Employee ID <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></Text>
                <Input
                  placeholder="e.g. FIRE-003"
                  value={form.employeeId}
                  onChange={(e) => set('employeeId', e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', marginTop: 20 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}
        >
          Cancel
        </Button>
        <Button
          loading={submitting}
          onClick={handleSubmit}
          style={{
            height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 600, fontSize: 12, flex: 1,
            background: '#7c3aed', borderColor: '#7c3aed', color: '#fff',
          }}
        >
          {userType === 'citizen' ? 'Add Citizen' : 'Add Team Member'}
        </Button>
      </div>
    </Modal>
  );
};

export default AddUserModal;