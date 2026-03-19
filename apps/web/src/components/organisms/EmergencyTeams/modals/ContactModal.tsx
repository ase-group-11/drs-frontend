// NEW FILE
import React, { useEffect, useState } from 'react';
import { Modal, Tag, Typography, Space, Spin } from 'antd';
import { PhoneOutlined, MailOutlined, UserOutlined, EnvironmentOutlined, FireOutlined } from '@ant-design/icons';
import type { EmergencyTeam, EmergencyUnitDetail } from '../../../../types';
import { getTeamById } from '../../../../services';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  deployed: '#2563eb', enroute: '#ea580c', onscene: '#dc2626',
  available: '#059669', maintenance: '#6b7280',
};

interface ContactModalProps {
  open: boolean;
  team: EmergencyTeam | null;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, team, onClose }) => {
  const [detail, setDetail] = useState<EmergencyUnitDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && team) {
      setLoading(true);
      getTeamById(team.id)
        .then((res) => { if (res.success && res.data) setDetail(res.data); })
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [open, team]);

  if (!team) return null;

  const statusColor = STATUS_COLORS[team.statusType] || '#6b7280';
  const assignment = detail?.current_assignment;

  const infoRow = (label: string, value: string | null, icon: React.ReactNode) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#f9fafb', borderRadius: 6, padding: '8px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{icon}</span>
        <Text style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</Text>
      </div>
      <Text style={{
        fontSize: 12, color: value ? '#111827' : '#9ca3af',
        fontStyle: value ? 'normal' : 'italic',
        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value ?? 'N/A'}
      </Text>
    </div>
  );

  return (
    <Modal
      title={<Text style={{ fontSize: 16, fontWeight: 700 }}>Contact Unit {team.unitId}</Text>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      destroyOnClose
    >
      <div style={{ paddingTop: 4 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : (
          <>
            {/* Team Leader */}
            <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Team Leader
            </Text>
            <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
              {infoRow('Name',  detail?.commander?.name  ?? null, <UserOutlined />)}
              {infoRow('Phone', detail?.commander?.phone ?? null, <PhoneOutlined />)}
              {infoRow('Email', detail?.commander?.email ?? null, <MailOutlined />)}
            </Space>

            {/* Current Assignment */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Current Assignment
              </Text>

              {assignment ? (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {infoRow('Disaster ID', assignment.disaster_tracking_id, <UserOutlined />)}
                  {infoRow('Type',        assignment.disaster_type,         <FireOutlined />)}
                  {infoRow('Location',    assignment.location,              <EnvironmentOutlined />)}
                  <div style={{ paddingTop: 2 }}>
                    <Tag style={{
                      background: `${statusColor}18`, color: statusColor,
                      border: `1px solid ${statusColor}40`, borderRadius: 20,
                      fontWeight: 600, fontSize: 11,
                    }}>
                      {assignment.deployment_status}
                    </Tag>
                  </div>
                </Space>
              ) : (
                <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12, display: 'block' }}>
                  No active assignment
                </Text>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ContactModal;