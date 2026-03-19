// UPDATED FILE
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Typography, message } from 'antd';
import {
  UsergroupAddOutlined, UserOutlined, MailOutlined, PhoneOutlined,
  EnvironmentOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { createTeam } from '../../../../services';
import type { CreateTeamPayload } from '../../../../types';

const { Text } = Typography;

interface CrewRow { id: string; name: string; email: string; }

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #e5e7eb',
  borderRadius: 6, fontSize: 12, color: '#374151', height: 34,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 3,
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

  const resetAll = () => { form.resetFields(); setCrewMembers([{ id: '1', name: '', email: '' }]); };
  const handleClose = () => { resetAll(); onClose(); };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload: CreateTeamPayload = {
        teamName: values.teamName, teamType: values.teamType,
        leaderName: values.leaderName, leaderEmail: values.leaderEmail,
        leaderPhone: values.leaderPhone,
        numberOfMembers: values.numberOfMembers ? parseInt(values.numberOfMembers, 10) : undefined,
        location: values.location, contactNumber: values.contactNumber,
        crewMembers: crewMembers.filter((c) => c.name || c.email),
      };
      const result = await createTeam(payload);
      if (result.success) {
        message.success(`Team ${values.teamName} created successfully`);
        onSuccess(); handleClose();
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

  const SectionTitle = ({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#7c3aed', fontSize: 14 }}>{icon}</span>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{title}</Text>
      </div>
      {action}
    </div>
  );

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null} width={480} destroyOnClose
      closeIcon={<span style={{ fontSize: 16, color: '#9ca3af' }}>✕</span>}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      {/* Scrollable body */}
      <div style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 20px 0' }}>

        <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 2 }}>
          Create Emergency Team
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 12 }}>
          Add a new emergency response team to the system
        </Text>

        <Form form={form} layout="vertical" requiredMark={false}>

          {/* Team Information */}
          <SectionTitle icon={<UsergroupAddOutlined />} title="Team Information" />
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

          <Form.Item name="teamName" style={{ marginBottom: 10 }} rules={[{ required: true, message: 'Required' }]}>
            <Text style={labelStyle}>Team Name <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input placeholder="e.g., Fire Unit F-12" style={inputStyle} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Form.Item name="teamType" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Required' }]}>
              <Text style={labelStyle}>Team Type <span style={{ color: '#ef4444' }}>*</span></Text>
              <div className="ct-select-wrap">
                <Select placeholder="Select type" style={{ height: 34, width: '100%' }}>
                  <Select.Option value="fire">Fire</Select.Option>
                  <Select.Option value="ambulance">Ambulance</Select.Option>
                  <Select.Option value="police">Police</Select.Option>
                  <Select.Option value="rescue">Rescue</Select.Option>
                </Select>
              </div>
            </Form.Item>
            <Form.Item name="numberOfMembers" style={{ marginBottom: 0 }}>
              <Text style={labelStyle}>No. of Members</Text>
              <Input type="number" min={1} placeholder="e.g., 4" style={inputStyle} />
            </Form.Item>
          </div>

          {/* Team Leader */}
          <SectionTitle icon={<UserOutlined />} title="Team Leader" />
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Form.Item name="leaderName" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Required' }]}>
              <Text style={labelStyle}>Leader Name <span style={{ color: '#ef4444' }}>*</span></Text>
              <Input placeholder="e.g., John Smith" style={inputStyle} />
            </Form.Item>
            <Form.Item name="leaderPhone" style={{ marginBottom: 0 }}>
              <Text style={labelStyle}>Phone Number</Text>
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af', fontSize: 11 }} />} placeholder="+353 1 234 5678" style={inputStyle} />
            </Form.Item>
          </div>

          <Form.Item name="leaderEmail" style={{ marginBottom: 10 }}
            rules={[{ required: true, message: 'Required' }, { type: 'email', message: 'Invalid email' }]}>
            <Text style={labelStyle}>Email Address <span style={{ color: '#ef4444' }}>*</span></Text>
            <Input prefix={<MailOutlined style={{ color: '#9ca3af', fontSize: 11 }} />} placeholder="e.g., john.smith@emergency.ie" style={inputStyle} />
          </Form.Item>

          {/* Crew Members */}
          <SectionTitle
            icon={<UsergroupAddOutlined />}
            title="Crew Members"
            action={
              <Button onClick={handleAddCrew} icon={<PlusOutlined />}
                style={{ borderColor: '#7c3aed', color: '#7c3aed', borderRadius: 6, fontWeight: 500, height: 28, fontSize: 11, padding: '0 10px' }}>
                Add
              </Button>
            }
          />
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {crewMembers.map((member, idx) => (
              <div key={member.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <Text style={{ ...labelStyle, marginBottom: 3 }}>Member {idx + 1} Name</Text>
                    <Input placeholder="Jane Doe" value={member.name}
                      onChange={(e) => updateCrew(member.id, 'name', e.target.value)}
                      style={{ ...inputStyle, height: 32 }} />
                  </div>
                  <div>
                    <Text style={{ ...labelStyle, marginBottom: 3 }}>Email</Text>
                    <Input placeholder="jane@emergency.ie" value={member.email}
                      onChange={(e) => updateCrew(member.id, 'email', e.target.value)}
                      style={{ ...inputStyle, height: 32 }} />
                  </div>
                  <button onClick={() => handleRemoveCrew(member.id)} disabled={crewMembers.length === 1}
                    style={{ width: 30, height: 32, border: 'none', background: 'transparent', cursor: crewMembers.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: crewMembers.length === 1 ? '#d1d5db' : '#ef4444', fontSize: 14, borderRadius: 4, flexShrink: 0 }}>
                    <DeleteOutlined />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Location */}
          <SectionTitle icon={<EnvironmentOutlined />} title="Location & Contact" />
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 10 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Form.Item name="location" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Required' }]}>
              <Text style={labelStyle}>Base Location <span style={{ color: '#ef4444' }}>*</span></Text>
              <Input prefix={<EnvironmentOutlined style={{ color: '#9ca3af', fontSize: 11 }} />} placeholder="Dublin Central Station" style={inputStyle} />
            </Form.Item>
            <Form.Item name="contactNumber" style={{ marginBottom: 0 }}>
              <Text style={labelStyle}>Contact Number</Text>
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af', fontSize: 11 }} />} placeholder="+353 1 987 6543" style={inputStyle} />
            </Form.Item>
          </div>

        </Form>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose} disabled={submitting}
          style={{ height: 36, paddingInline: 16, borderRadius: 6, fontWeight: 500, fontSize: 12, border: '1px solid #e5e7eb', color: '#374151' }}>
          Cancel
        </Button>
        <Button type="primary" loading={submitting} onClick={handleSubmit}
          style={{ height: 36, paddingInline: 20, borderRadius: 6, fontWeight: 600, fontSize: 12, background: '#7c3aed', borderColor: '#7c3aed' }}>
          Create Team
        </Button>
      </div>

      <style>{`
        .ct-select-wrap .ant-select-selector {
          background: #f3f4f6 !important; border: 1px solid #e5e7eb !important;
          border-radius: 6px !important; height: 34px !important; align-items: center !important;
        }
        .ct-select-wrap .ant-select-selection-placeholder,
        .ct-select-wrap .ant-select-selection-item {
          font-size: 12px !important; color: #374151 !important;
        }
      `}</style>
    </Modal>
  );
};

export default CreateTeamModal;