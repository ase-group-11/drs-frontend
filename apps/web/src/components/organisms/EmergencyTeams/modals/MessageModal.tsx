// UPDATED FILE
import React, { useState } from 'react';
import {
  Modal, Button, Input, Select, Typography, Tag,
  message as antMessage,
} from 'antd';
import {
  SendOutlined, CheckCircleOutlined, LoadingOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import type { EmergencyTeam } from '../../../../types';

const { TextArea } = Input;
const { Text } = Typography;

const TYPE_ICON_MAP: Record<string, string> = {
  Fire: '🔥', Ambulance: '🚑', Police: '🚓', Rescue: '🚁',
};

const MESSAGE_TEMPLATES: Record<string, string> = {
  custom: '',
  'status-update': 'Please provide a status update on your current situation.',
  'return-base': 'Request to return to base when current assignment is complete.',
  resources: 'Additional resources are being dispatched to your location.',
  situation: 'Update: Situation has been assessed. Proceed with caution.',
};

const TYPE_LABEL_COLORS: Record<string, string> = {
  standard: '#2563eb', urgent: '#ea580c', emergency: '#dc2626',
};
const TYPE_BORDER_ACTIVE: Record<string, string> = {
  standard: '#2563eb', urgent: '#ea580c', emergency: '#dc2626',
};
const TYPE_BG_ACTIVE: Record<string, string> = {
  standard: '#eff6ff', urgent: '#fff7ed', emergency: '#fef2f2',
};

interface MessageModalProps {
  open: boolean;
  team: EmergencyTeam | null;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#374151',
};

const MessageModal: React.FC<MessageModalProps> = ({ open, team, onClose }) => {
  const [messageType, setMessageType] = useState<'standard' | 'urgent' | 'emergency'>('standard');
  const [template, setTemplate] = useState('custom');
  const [msg, setMsg] = useState('');
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
    setSending(false);
    setSuccess(false);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSuccess(true);
    setTimeout(() => {
      antMessage.success(`Message sent to Unit ${team.unitId}`);
      handleClose();
    }, 2000);
  };

  const typeIcon = TYPE_ICON_MAP[team.type] || '🚒';

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <Modal open={open} onCancel={handleClose} footer={null} width={480} destroyOnClose
        styles={{ content: { borderRadius: 12 } }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 16 }}>
          <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 32 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 6 }}>Message Sent Successfully</Text>
            <Text type="secondary" style={{ fontSize: 14 }}>Unit {team.unitId} has been notified.</Text>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      destroyOnClose
      closeIcon={<span style={{ fontSize: 18, color: '#9ca3af' }}>✕</span>}
      styles={{ body: { padding: 0 }, content: { borderRadius: 12, overflow: 'hidden', padding: 0 } }}
    >
      <div style={{ padding: '16px 20px 0' }}>

        <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 2 }}>
          Message Unit {team.unitId}
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 12 }}>
          Send a direct message to the unit
        </Text>

        {/* Unit info strip */}
        <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, background: '#e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            {typeIcon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
              {team.unitId} – {team.type} Response
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag style={{ background: '#dbeafe', color: '#1d4ed8', border: 0, borderRadius: 20, fontSize: 11, fontWeight: 500, padding: '0 6px', margin: 0 }}>
                {team.status}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <EnvironmentOutlined style={{ marginRight: 3 }} />{team.location}
              </Text>
            </div>
          </div>
        </div>

        {/* Message Type */}
        <div style={{ marginBottom: 10 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: '#111827' }}>Message Type</Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {(['standard', 'urgent', 'emergency'] as const).map((type) => {
              const active = messageType === type;
              return (
                <button key={type} onClick={() => setMessageType(type)}
                  style={{ border: `2px solid ${active ? TYPE_BORDER_ACTIVE[type] : '#e5e7eb'}`, borderRadius: 6, padding: '6px 4px', cursor: 'pointer', background: active ? TYPE_BG_ACTIVE[type] : '#fff', transition: 'all 0.15s', textAlign: 'center', outline: 'none' }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: active ? TYPE_LABEL_COLORS[type] : (type === 'standard' ? '#6b7280' : TYPE_LABEL_COLORS[type]) }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warning banner */}
        {messageType !== 'standard' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: messageType === 'urgent' ? '#fff7ed' : '#fef2f2', borderLeft: `3px solid ${messageType === 'urgent' ? '#ea580c' : '#dc2626'}`, borderRadius: '0 6px 6px 0', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: messageType === 'urgent' ? '#ea580c' : '#dc2626', flexShrink: 0 }}>⚠</span>
            <Text style={{ fontSize: 11, color: '#374151' }}>Marked as {messageType} — will trigger alerts</Text>
          </div>
        )}

        {/* Quick Templates */}
        <div style={{ marginBottom: 10 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#111827' }}>Quick Templates</Text>
          <div className="mm-select-wrap">
            <Select value={template} onChange={handleTemplateChange} style={{ width: '100%', height: 36 }}>
              <Select.Option value="custom">Custom Message</Select.Option>
              <Select.Option value="status-update">Status Update Request</Select.Option>
              <Select.Option value="return-base">Return to Base</Select.Option>
              <Select.Option value="resources">Additional Resources Needed</Select.Option>
              <Select.Option value="situation">Situation Update</Select.Option>
            </Select>
          </div>
        </div>

        {/* Message textarea */}
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#111827' }}>Message</Text>
          <TextArea
            rows={2}
            placeholder="Type your message here..."
            value={msg}
            onChange={(e) => e.target.value.length <= 500 && setMsg(e.target.value)}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{msg.length}/500</div>
        </div>

      </div>

      {/* Sticky footer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px 14px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
        <Button onClick={handleClose} disabled={sending}
          style={{ height: 40, paddingInline: 20, borderRadius: 8, fontWeight: 600, fontSize: 13, border: '1.5px solid #e5e7eb', color: '#111827' }}>
          Cancel
        </Button>
        <Button type="primary" icon={sending ? <LoadingOutlined /> : <SendOutlined />}
          loading={sending} disabled={!msg.trim()} onClick={handleSend}
          style={{ height: 40, paddingInline: 20, borderRadius: 8, fontWeight: 600, fontSize: 13, background: '#7c3aed', borderColor: '#7c3aed', flex: 1 }}>
          {sending ? 'Sending...' : 'Send Message'}
        </Button>
      </div>

      <style>{`
        .mm-select-wrap .ant-select-selector {
          background: #f3f4f6 !important; border: 1px solid #e5e7eb !important;
          border-radius: 8px !important; height: 36px !important;
          align-items: center !important; font-size: 13px !important;
        }
        .mm-select-wrap .ant-select-selection-item {
          font-size: 13px !important; color: #374151 !important; line-height: 36px !important;
        }
      `}</style>
    </Modal>
  );
};

export default MessageModal;