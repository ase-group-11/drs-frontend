// UPDATED FILE — Redesigned to match Figma
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Checkbox,
  Typography,
  Tag,
  Upload,
  message as antMessage,
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { EmergencyTeam } from '../../../../types';

const { TextArea } = Input;
const { Text } = Typography;

const TYPE_ICON_MAP: Record<string, string> = {
  Fire: '🔥',
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

// Per-type label colors (shown even when not selected)
const TYPE_LABEL_COLORS: Record<string, string> = {
  standard: '#2563eb',
  urgent: '#ea580c',
  emergency: '#dc2626',
};

const TYPE_BORDER_ACTIVE: Record<string, string> = {
  standard: '#2563eb',
  urgent: '#ea580c',
  emergency: '#dc2626',
};

const TYPE_BG_ACTIVE: Record<string, string> = {
  standard: '#eff6ff',
  urgent: '#fff7ed',
  emergency: '#fef2f2',
};

interface MessageModalProps {
  open: boolean;
  team: EmergencyTeam | null;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  color: '#374151',
};

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
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setSuccess(true);
    setTimeout(() => {
      antMessage.success(`Message sent to Unit ${team.unitId}`);
      handleClose();
    }, 2000);
  };

  const typeIcon = TYPE_ICON_MAP[team.type] || '🚒';
  const deliveryText = `Radio${smsBackup ? ' + SMS' : ''}`;

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
            <Text type="secondary" style={{ fontSize: 14 }}>
              Unit {team.unitId} will receive this message via radio{smsBackup ? ' and SMS' : ''}
            </Text>
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
      width={600}
      destroyOnClose
      closeIcon={<span style={{ fontSize: 18, color: '#9ca3af' }}>✕</span>}
      styles={{
        body: { padding: 0 },
        content: { borderRadius: 12, overflow: 'hidden', padding: 0 },
      }}
    >
      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div style={{ maxHeight: '82vh', overflowY: 'auto', padding: '28px 28px 0' }}>

        {/* Title + subtitle */}
        <Text style={{ fontSize: 20, fontWeight: 800, color: '#111827', display: 'block', marginBottom: 4 }}>
          Message Unit {team.unitId}
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 20 }}>
          Send a direct message to the unit
        </Text>

        {/* ── Unit info strip ─────────────────────────────────────────────── */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #e0f2fe',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
        }}>
          <div style={{
            width: 48, height: 48, background: '#e5e7eb', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
          }}>
            {typeIcon}
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
              {team.unitId} – {team.type} Response
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag style={{ background: '#dbeafe', color: '#1d4ed8', border: 0, borderRadius: 20, fontSize: 12, fontWeight: 500, padding: '1px 10px' }}>
                {team.status}
              </Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <EnvironmentOutlined style={{ marginRight: 3 }} />
                {team.location}
              </Text>
            </div>
          </div>
        </div>

        {/* ── Message Type ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 10, color: '#111827' }}>
            Message Type
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {(['standard', 'urgent', 'emergency'] as const).map((type) => {
              const active = messageType === type;
              const labelColor = TYPE_LABEL_COLORS[type];
              return (
                <button
                  key={type}
                  onClick={() => setMessageType(type)}
                  style={{
                    border: `2px solid ${active ? TYPE_BORDER_ACTIVE[type] : '#e5e7eb'}`,
                    borderRadius: 10,
                    padding: '12px 8px',
                    cursor: 'pointer',
                    background: active ? TYPE_BG_ACTIVE[type] : '#fff',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: active ? labelColor : (type === 'standard' ? '#6b7280' : labelColor),
                  }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Warning banner for urgent/emergency ───────────────────────── */}
        {messageType !== 'standard' && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            background: messageType === 'urgent' ? '#fff7ed' : '#fef2f2',
            borderLeft: `4px solid ${messageType === 'urgent' ? '#ea580c' : '#dc2626'}`,
            borderRadius: '0 8px 8px 0',
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 16, color: messageType === 'urgent' ? '#ea580c' : '#dc2626', flexShrink: 0, marginTop: 1 }}>⚠</span>
            <Text style={{ fontSize: 14, color: '#374151' }}>
              This message will be marked as {messageType} and will trigger alerts
            </Text>
          </div>
        )}

        {/* ── Quick Templates ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8, color: '#111827' }}>
            Quick Templates
          </Text>
          <div className="mm-select-wrap">
            <Select
              value={template}
              onChange={handleTemplateChange}
              style={{ width: '100%', height: 44 }}
            >
              <Select.Option value="custom">Custom Message</Select.Option>
              <Select.Option value="status-update">Status Update Request</Select.Option>
              <Select.Option value="return-base">Return to Base</Select.Option>
              <Select.Option value="resources">Additional Resources Needed</Select.Option>
              <Select.Option value="situation">Situation Update</Select.Option>
            </Select>
          </div>
        </div>

        {/* ── Message textarea ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8, color: '#111827' }}>
            Message
          </Text>
          <TextArea
            rows={5}
            placeholder="Type your message here..."
            value={msg}
            onChange={(e) => e.target.value.length <= 500 && setMsg(e.target.value)}
            style={{
              ...inputStyle,
              resize: 'none',
              height: 'auto',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            {msg.length}/500
          </div>
        </div>

        {/* ── Attachments ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8, color: '#111827' }}>
            Attachments (optional)
          </Text>
          <Upload beforeUpload={() => false} showUploadList={false} style={{ display: 'block', width: '100%' }}>
            <div style={{
              border: '2px dashed #c4c9d4',
              background: '#eef1f6',
              borderRadius: 10,
              padding: '28px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <PaperClipOutlined style={{ fontSize: 24, color: '#9ca3af', display: 'block', marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: '#6b7280', display: 'block' }}>
                Click to attach files or drag and drop
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>PDF, Images up to 10MB</Text>
            </div>
          </Upload>
        </div>

        {/* ── Delivery options ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            { checked: smsBackup, onChange: setSmsBackup, label: 'Send SMS backup' },
            { checked: readReceipt, onChange: setReadReceipt, label: 'Request read receipt' },
            { checked: allCrew, onChange: setAllCrew, label: 'Send to all crew members' },
          ].map(({ checked, onChange, label }) => (
            <Checkbox
              key={label}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}
            >
              {label}
            </Checkbox>
          ))}
        </div>

      </div>

      {/* ── Sticky footer ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 28px 16px',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        gap: 10,
      }}>
        {/* Delivery info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/><circle cx="12" cy="12" r="2"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>
            Will be delivered via: {deliveryText}
          </Text>
        </div>
        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            onClick={handleClose}
            disabled={sending}
            style={{
              height: 46, paddingInline: 24, borderRadius: 10,
              fontWeight: 600, fontSize: 14,
              border: '1.5px solid #e5e7eb', color: '#111827',
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            icon={sending ? <LoadingOutlined /> : <SendOutlined />}
            loading={sending}
            disabled={!msg.trim()}
            onClick={handleSend}
            style={{
              height: 46, paddingInline: 24, borderRadius: 10,
              fontWeight: 600, fontSize: 14,
              background: '#c4b5fd',
              borderColor: '#c4b5fd',
            }}
          >
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>

      {/* ── Inline styles for Select ─────────────────────────────────────────── */}
      <style>{`
        .mm-select-wrap .ant-select-selector {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          height: 44px !important;
          align-items: center !important;
          font-size: 14px !important;
        }
        .mm-select-wrap .ant-select-selection-item {
          font-size: 14px !important;
          color: #374151 !important;
          line-height: 44px !important;
        }
        .mm-select-wrap .ant-select-focused .ant-select-selector,
        .mm-select-wrap .ant-select-selector:focus {
          box-shadow: none !important;
          border-color: #d1d5db !important;
        }
        .mm-textarea-gray textarea {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
        }
        .mm-textarea-gray textarea:focus {
          box-shadow: none !important;
          border-color: #d1d5db !important;
        }
        /* Checkboxes — black when checked, matching Figma */
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #111827 !important;
          border-color: #111827 !important;
        }
        .ant-checkbox-checked:after {
          border-color: #111827 !important;
        }
        .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #374151 !important;
        }
      `}</style>
    </Modal>
  );
};

export default MessageModal;