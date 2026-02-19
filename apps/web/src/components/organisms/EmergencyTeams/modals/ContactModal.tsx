// NEW FILE
import React from 'react';
import { Modal, Tag, Button, Typography, Space } from 'antd';
import { PhoneOutlined, MailOutlined, WifiOutlined } from '@ant-design/icons';
import type { EmergencyTeam } from '../../../../types';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  deployed: '#2563eb',
  enroute: '#ea580c',
  onscene: '#dc2626',
  available: '#059669',
  maintenance: '#6b7280',
};

interface ContactModalProps {
  open: boolean;
  team: EmergencyTeam | null;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, team, onClose }) => {
  if (!team) return null;

  const hasAssignment = ['deployed', 'enroute', 'onscene'].includes(team.statusType);
  const unitEmail = `team.${team.unitId.toLowerCase().replace('-', '')}@dublin-${team.type.toLowerCase()}.ie`;
  const statusColor = STATUS_COLORS[team.statusType] || '#6b7280';

  const contactRows = [
    { label: 'Radio Channel', value: 'CH-04', mono: true },
    { label: 'Team Leader', value: '+353 87 123 4567', mono: true },
    { label: 'Emergency Line', value: '+353 1 999 9999', mono: true },
    { label: 'Station Direct', value: '+353 1 666 7777', mono: true },
    { label: 'Email', value: unitEmail, mono: false },
  ];

  return (
    <Modal
      title={`Contact Unit ${team.unitId}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      destroyOnClose
    >
      <div style={{ paddingTop: 8 }}>
        {/* Contact info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {contactRows.map(({ label, value, mono }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f9fafb',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <Text style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#111827',
                  fontFamily: mono ? 'monospace' : undefined,
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </Text>
            </div>
          ))}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <Button
            block
            size="large"
            icon={<PhoneOutlined />}
            style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontWeight: 500 }}
            onClick={() => {}}
          >
            Call Team Leader
          </Button>
          <Button
            block
            size="large"
            icon={<WifiOutlined />}
            style={{ background: '#2563eb', borderColor: '#2563eb', color: '#fff', fontWeight: 500 }}
            onClick={() => {}}
          >
            Send Radio Message
          </Button>
          <Button
            block
            size="large"
            icon={<MailOutlined />}
            style={{ background: '#f3f4f6', borderColor: '#e5e7eb', color: '#374151', fontWeight: 500 }}
            onClick={() => {}}
          >
            Email Team
          </Button>
        </div>

        {/* Current Assignment */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
          <Text
            type="secondary"
            style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}
          >
            Current Assignment
          </Text>
          {hasAssignment ? (
            <div style={{ marginTop: 10 }}>
              <Text strong style={{ display: 'block', fontSize: 13 }}>DR-2025-001</Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                {team.location}
              </Text>
              <Tag
                style={{
                  marginTop: 8,
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {team.status}
              </Tag>
            </div>
          ) : (
            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13, marginTop: 8, display: 'block' }}>
              No active assignment
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ContactModal;
