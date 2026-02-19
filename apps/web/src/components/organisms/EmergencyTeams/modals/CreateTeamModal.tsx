// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Typography,
  Divider,
  Space,
  message,
} from 'antd';
import {
  TeamOutlined,
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
      title="Create Emergency Team"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
      destroyOnClose
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        Add a new emergency response team to the system
      </Text>

      <Form form={form} layout="vertical" requiredMark={false}>
        {/* Team Information */}
        <Divider orientation="left" orientationMargin={0} style={{ margin: '0 0 16px' }}>
          <Space size={6}>
            <TeamOutlined style={{ color: '#7c3aed' }} />
            <Text strong style={{ fontSize: 13 }}>Team Information</Text>
          </Space>
        </Divider>

        <Form.Item
          name="teamName"
          label="Team Name"
          rules={[{ required: true, message: 'Please enter the team name' }]}
        >
          <Input placeholder="e.g., Fire Unit F-12" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="teamType"
            label="Team Type"
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select placeholder="Select type">
              <Select.Option value="fire">Fire</Select.Option>
              <Select.Option value="ambulance">Ambulance</Select.Option>
              <Select.Option value="police">Police</Select.Option>
              <Select.Option value="rescue">Rescue</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="numberOfMembers" label="Number of Members">
            <Input type="number" min={1} placeholder="e.g., 4" />
          </Form.Item>
        </div>

        {/* Team Leader */}
        <Divider orientation="left" orientationMargin={0} style={{ margin: '8px 0 16px' }}>
          <Space size={6}>
            <UserOutlined style={{ color: '#7c3aed' }} />
            <Text strong style={{ fontSize: 13 }}>Team Leader</Text>
          </Space>
        </Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="leaderName"
            label="Leader Name"
            rules={[{ required: true, message: 'Please enter the leader name' }]}
          >
            <Input placeholder="e.g., John Smith" />
          </Form.Item>

          <Form.Item name="leaderPhone" label="Phone Number">
            <Input prefix={<PhoneOutlined />} placeholder="+353 1 234 5678" />
          </Form.Item>
        </div>

        <Form.Item
          name="leaderEmail"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter an email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="leader@emergency.ie" />
        </Form.Item>

        {/* Crew Members */}
        <Divider orientation="left" orientationMargin={0} style={{ margin: '8px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space size={6}>
              <TeamOutlined style={{ color: '#7c3aed' }} />
              <Text strong style={{ fontSize: 13 }}>Crew Members</Text>
            </Space>
          </div>
        </Divider>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
          {crewMembers.map((member, idx) => (
            <div
              key={member.id}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}
            >
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Member {idx + 1} – Name</Text>
                  <Input
                    size="small"
                    placeholder="e.g., Jane Doe"
                    value={member.name}
                    onChange={(e) => updateCrew(member.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Member {idx + 1} – Email</Text>
                  <Input
                    size="small"
                    placeholder="jane@emergency.ie"
                    value={member.email}
                    onChange={(e) => updateCrew(member.id, 'email', e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={crewMembers.length === 1}
                onClick={() => handleRemoveCrew(member.id)}
                style={{ marginTop: 20 }}
              />
            </div>
          ))}
        </div>

        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={handleAddCrew}
          style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
        >
          Add Member
        </Button>

        {/* Location & Contact */}
        <Divider orientation="left" orientationMargin={0} style={{ margin: '16px 0' }}>
          <Space size={6}>
            <EnvironmentOutlined style={{ color: '#7c3aed' }} />
            <Text strong style={{ fontSize: 13 }}>Location & Contact</Text>
          </Space>
        </Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="location"
            label="Base Location"
            rules={[{ required: true, message: 'Please enter the location' }]}
          >
            <Input prefix={<EnvironmentOutlined />} placeholder="Dublin Central Station" />
          </Form.Item>

          <Form.Item name="contactNumber" label="Contact Number">
            <Input prefix={<PhoneOutlined />} placeholder="+353 1 987 6543" />
          </Form.Item>
        </div>
      </Form>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          paddingTop: 16,
          borderTop: '1px solid #f3f4f6',
          marginTop: 8,
        }}
      >
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
        >
          Create Team
        </Button>
      </div>
    </Modal>
  );
};

export default CreateTeamModal;
