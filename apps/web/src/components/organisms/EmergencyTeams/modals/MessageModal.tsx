// NEW FILE
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Checkbox,
  Typography,
  Tag,
  Space,
  Upload,
  message as antMessage,
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { EmergencyTeam } from '../../../../types';

const { TextArea } = Input;
const { Text } = Typography;

const TYPE_ICON_MAP: Record<string, string> = {
  Fire: '🚒',
  Ambulance: '🚑',
  Police: '🚓',
  Rescue: '🚁',
};

const MESSAGE_TEMPLATES: Record<string, string> = {
  custom: '',
  'status-update': 'Please provide a status update on your current situation.',
  'return-base': 'Request to return to base when current assignment is complete.',
  resources: 'Additional resources are being dispatched to your location.',
  situation: 'Update: Situation has been assessed. Proceed with caution.',
};

const PRIORITY_CONFIG = {
  standard: { label: 'Standard', border: '#2563eb', bg: '#eff6ff', text: '#2563eb' },
  urgent: { label: 'Urgent', border: '#ea580c', bg: '#fff7ed', text: '#ea580c' },
  emergency: { label: 'Emergency', border: '#dc2626', bg: '#fef2f2', text: '#dc2626' },
};

interface MessageModalProps {
  open: boolean;
  team: EmergencyTeam | null;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ open, team, onClose }) => {
  const [messageType, setMessageType] = useState<'standard' | 'urgent' | 'emergency'>('standard');
  const [template, setTemplate] = useState('custom');
  const [msg, setMsg] = useState('');
  const [smsBackup, setSmsBackup] = useState(true);
  const [readReceipt, setReadReceipt] = useState(false);
  const [allCrew, setAllCrew] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!team) return null;

  const handleTemplateChange = (val: string) => {
    setTemplate(val);
    setMsg(MESSAGE_TEMPLATES[val] || '');
  };

  const handleReset = () => {
    setMessageType('standard');
    setTemplate('custom');
    setMsg('');
    setSmsBackup(true);
    setReadReceipt(false);
    setAllCrew(false);
    setSending(false);
    setSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    // Simulate API call — wire to /api/admin/teams/:id/message when ready
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSuccess(true);
    setTimeout(() => {
      antMessage.success(`Message sent to Unit ${team.unitId}`);
      handleClose();
    }, 2000);
  };

  const typeIcon = TYPE_ICON_MAP[team.type] || '🚒';

  // Success screen
  if (success) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={440} destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
          <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 32 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 18, display: 'block' }}>Message Sent Successfully</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Unit {team.unitId} will receive this message via radio{smsBackup ? ' and SMS' : ''}
            </Text>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Message Unit ${team.unitId}`}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      destroyOnClose
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Unit info strip */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {typeIcon}
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 13 }}>{team.unitId} – {team.type} Response</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Tag style={{ background: '#dbeafe', color: '#1d4ed8', border: 0, borderRadius: 20, fontSize: 11 }}>
                {team.status}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EnvironmentOutlined style={{ marginRight: 3 }} />
                {team.location}
              </Text>
            </div>
          </div>
        </div>

        {/* Message type selector */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#374151' }}>Message Type</Text>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['standard', 'urgent', 'emergency'] as const).map((type) => {
              const cfg = PRIORITY_CONFIG[type];
              const active = messageType === type;
              return (
                <div
                  key={type}
                  onClick={() => setMessageType(type)}
                  style={{
                    flex: 1,
                    border: `2px solid ${active ? cfg.border : '#e5e7eb'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: active ? cfg.bg : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 500, color: active ? cfg.text : '#6b7280' }}>
                    {cfg.label}
                  </Text>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority warning */}
        {messageType !== 'standard' && (
          <div
            style={{
              padding: '10px 12px',
              borderLeft: `3px solid ${PRIORITY_CONFIG[messageType].border}`,
              background: PRIORITY_CONFIG[messageType].bg,
              borderRadius: '0 6px 6px 0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <WarningOutlined style={{ color: PRIORITY_CONFIG[messageType].border, marginTop: 2 }} />
            <Text style={{ fontSize: 13, color: '#374151' }}>
              This message will be marked as {messageType} and will trigger alerts
            </Text>
          </div>
        )}

        {/* Template selector */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#374151' }}>
            Quick Templates
          </Text>
          <Select value={template} onChange={handleTemplateChange} style={{ width: '100%' }}>
            <Select.Option value="custom">Custom Message</Select.Option>
            <Select.Option value="status-update">Status Update Request</Select.Option>
            <Select.Option value="return-base">Return to Base</Select.Option>
            <Select.Option value="resources">Additional Resources Needed</Select.Option>
            <Select.Option value="situation">Situation Update</Select.Option>
          </Select>
        </div>

        {/* Message body */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#374151' }}>
            Message
          </Text>
          <TextArea
            rows={4}
            placeholder="Type your message here..."
            value={msg}
            onChange={(e) => e.target.value.length <= 500 && setMsg(e.target.value)}
            style={{ resize: 'none' }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            {msg.length}/500
          </div>
        </div>

        {/* Attachments */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#374151' }}>
            Attachments (optional)
          </Text>
          <Upload beforeUpload={() => false} showUploadList={false}>
            <div
              style={{
                border: '2px dashed #d1d5db',
                background: '#f9fafb',
                borderRadius: 8,
                padding: '16px 24px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <PaperClipOutlined style={{ fontSize: 22, color: '#9ca3af', display: 'block', marginBottom: 6 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>Click to attach files or drag and drop</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>PDF, Images up to 10MB</Text>
            </div>
          </Upload>
        </div>

        {/* Delivery options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Checkbox checked={smsBackup} onChange={(e) => setSmsBackup(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Send SMS backup</Text>
          </Checkbox>
          <Checkbox checked={readReceipt} onChange={(e) => setReadReceipt(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Request read receipt</Text>
          </Checkbox>
          <Checkbox checked={allCrew} onChange={(e) => setAllCrew(e.target.checked)}>
            <Text style={{ fontSize: 13 }}>Send to all crew members</Text>
          </Checkbox>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Via: Radio{smsBackup ? ' + SMS' : ''}
          </Text>
          <Space>
            <Button onClick={handleClose} disabled={sending}>Cancel</Button>
            <Button
              type="primary"
              icon={sending ? <LoadingOutlined /> : <SendOutlined />}
              loading={sending}
              disabled={!msg.trim()}
              onClick={handleSend}
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            >
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default MessageModal;
