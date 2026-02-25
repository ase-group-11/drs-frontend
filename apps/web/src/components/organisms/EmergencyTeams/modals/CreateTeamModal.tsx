// UPDATED FILE — Redesigned to match Figma
import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
} from 'antd';
import {
  UsergroupAddOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { createTeam } from '../../../../services';
import type { CreateTeamPayload } from '../../../../types';

const { Text } = Typography;

interface CrewRow {
  id: string;
  name: string;
  email: string;
}

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Shared label style ─────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <div style={{ marginBottom: 6 }}>
    <Text style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
      {text}
    </Text>
    {required && (
      <Text style={{ color: '#ef4444', marginLeft: 4, fontSize: 14 }}>*</Text>
    )}
  </div>
);

// ── Section divider matching Figma ─────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div style={{ marginBottom: 20, marginTop: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#7c3aed', fontSize: 20, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <Text style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</Text>
      </div>
      {action}
    </div>
    <div style={{ height: 1, background: '#e5e7eb' }} />
  </div>
);

// ── Styled input wrapper (gray bg to match Figma) ──────────────────────────────
const inputStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  color: '#374151',
  height: 44,
};

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewRow[]>([{ id: '1', name: '', email: '' }]);

  const handleAddCrew = () =>
    setCrewMembers((prev) => [...prev, { id: String(Date.now()), name: '', email: '' }]);

  const handleRemoveCrew = (id: string) => {
    if (crewMembers.length > 1) setCrewMembers((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCrew = (id: string, field: 'name' | 'email', value: string) =>
    setCrewMembers((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const resetAll = () => {
    form.resetFields();
    setCrewMembers([{ id: '1', name: '', email: '' }]);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload: CreateTeamPayload = {
        teamName: values.teamName,
        teamType: values.teamType,
        leaderName: values.leaderName,
        leaderEmail: values.leaderEmail,
        leaderPhone: values.leaderPhone,
        numberOfMembers: values.numberOfMembers ? parseInt(values.numberOfMembers, 10) : undefined,
        location: values.location,
        contactNumber: values.contactNumber,
        crewMembers: crewMembers.filter((c) => c.name || c.email),
      };

      const result = await createTeam(payload);
      if (result.success) {
        message.success(`Team ${values.teamName} created successfully`);
        onSuccess();
        handleClose();
      } else {
        message.error(result.message || 'Failed to create team');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={620}
      destroyOnClose
      closeIcon={<span style={{ fontSize: 18, color: '#9ca3af' }}>✕</span>}
      styles={{
        body: { padding: 0 },
        content: { borderRadius: 12, overflow: 'hidden', padding: 0 },
      }}
    >
      {/* Scrollable body */}
      <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '28px 28px 0' }}>
        {/* Modal title */}
        <Text style={{ fontSize: 22, fontWeight: 800, color: '#111827', display: 'block', marginBottom: 6 }}>
          Create Emergency Team
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 28 }}>
          Add a new emergency response team to the system
        </Text>

        <Form form={form} layout="vertical" requiredMark={false}>

          {/* ── Team Information ─────────────────────────────────────────────── */}
          <SectionHeader icon={<UsergroupAddOutlined />} title="Team Information" />

          <Form.Item
            name="teamName"
            style={{ marginBottom: 20 }}
            rules={[{ required: true, message: 'Please enter the team name' }]}
          >
            <FieldLabel text="Team Name" required />
            <Input
              placeholder="e.g., Fire Unit F-12"
              style={inputStyle}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <Form.Item
              name="teamType"
              style={{ marginBottom: 20 }}
              rules={[{ required: true, message: 'Please select a type' }]}
            >
              <FieldLabel text="Team Type" required />
              <div className="ct-select-wrap">
                <Select
                  placeholder="Select type"
                  style={{ height: 44, width: '100%' }}
                >
                  <Select.Option value="fire">Fire</Select.Option>
                  <Select.Option value="ambulance">Ambulance</Select.Option>
                  <Select.Option value="police">Police</Select.Option>
                  <Select.Option value="rescue">Rescue</Select.Option>
                </Select>
              </div>
            </Form.Item>

            <Form.Item name="numberOfMembers" style={{ marginBottom: 20 }}>
              <FieldLabel text="Number of Members" />
              <Input
                type="number"
                min={1}
                placeholder="e.g., 4"
                style={inputStyle}
              />
            </Form.Item>
          </div>

          {/* ── Team Leader ──────────────────────────────────────────────────── */}
          <SectionHeader icon={<UserOutlined />} title="Team Leader" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="leaderName"
              style={{ marginBottom: 20 }}
              rules={[{ required: true, message: 'Please enter the leader name' }]}
            >
              <FieldLabel text="Leader Name" required />
              <Input placeholder="e.g., John Smith" style={inputStyle} />
            </Form.Item>

            <Form.Item name="leaderPhone" style={{ marginBottom: 20 }}>
              <FieldLabel text="Phone Number" />
              <Input
                prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                placeholder="e.g., +353 1 234 5678"
                style={inputStyle}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="leaderEmail"
            style={{ marginBottom: 20 }}
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <FieldLabel text="Email Address" required />
            <Input
              prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
              placeholder="e.g., john.smith@emergency.ie"
              style={inputStyle}
            />
          </Form.Item>

          {/* ── Crew Members ─────────────────────────────────────────────────── */}
          <SectionHeader
            icon={<UsergroupAddOutlined />}
            title="Crew Members"
            action={
              <Button
                onClick={handleAddCrew}
                icon={<PlusOutlined />}
                style={{
                  borderColor: '#7c3aed',
                  color: '#7c3aed',
                  borderRadius: 8,
                  fontWeight: 500,
                  height: 36,
                }}
              >
                Add Member
              </Button>
            }
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {crewMembers.map((member, idx) => (
              <div
                key={member.id}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                  {/* Name */}
                  <div>
                    <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                      Member {idx + 1} - Name
                    </Text>
                    <Input
                      placeholder="e.g., Jane Doe"
                      value={member.name}
                      onChange={(e) => updateCrew(member.id, 'name', e.target.value)}
                      style={{ ...inputStyle, height: 40 }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                      Member {idx + 1} - Email
                    </Text>
                    <Input
                      placeholder="e.g., jane@emergency.ie"
                      value={member.email}
                      onChange={(e) => updateCrew(member.id, 'email', e.target.value)}
                      style={{ ...inputStyle, height: 40 }}
                    />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleRemoveCrew(member.id)}
                    disabled={crewMembers.length === 1}
                    style={{
                      width: 36,
                      height: 40,
                      border: 'none',
                      background: 'transparent',
                      cursor: crewMembers.length === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: crewMembers.length === 1 ? '#d1d5db' : '#ef4444',
                      fontSize: 16,
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Location & Contact ───────────────────────────────────────────── */}
          <SectionHeader icon={<EnvironmentOutlined />} title="Location & Contact" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <Form.Item
              name="location"
              style={{ marginBottom: 20 }}
              rules={[{ required: true, message: 'Please enter the location' }]}
            >
              <FieldLabel text="Base Location" required />
              <Input
                prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />}
                placeholder="e.g., Dublin Central Station"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item name="contactNumber" style={{ marginBottom: 20 }}>
              <FieldLabel text="Contact Number" />
              <Input
                prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                placeholder="e.g., +353 1 987 6543"
                style={inputStyle}
              />
            </Form.Item>
          </div>


      <style>{`
        .ct-select-wrap .ant-select-selector {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          height: 44px !important;
          align-items: center !important;
        }
        .ct-select-wrap .ant-select-selection-placeholder,
        .ct-select-wrap .ant-select-selection-item {
          font-size: 14px !important;
          color: #374151 !important;
        }
      `}</style>
        </Form>
      </div>

      {/* ── Sticky Footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          padding: '16px 28px',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <Button
          onClick={handleClose}
          disabled={submitting}
          style={{
            height: 44,
            paddingInline: 24,
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            border: '1px solid #e5e7eb',
            color: '#374151',
          }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          style={{
            height: 44,
            paddingInline: 24,
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            background: '#7c3aed',
            borderColor: '#7c3aed',
          }}
        >
          Create Team
        </Button>
      </div>
    </Modal>
  );
};

export default CreateTeamModal;