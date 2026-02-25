// NEW FILE
import React, { useState } from 'react';
import { Button, Tag, Card, Avatar, Typography, Space, Row, Col, Badge } from 'antd';
import {
  ArrowLeftOutlined,
  TeamOutlined,
  SendOutlined,
  SettingOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { EmergencyTeam } from '../../../types';
import DeployUnitModal from './modals/DeployUnitModal';
import EditConfigModal from './modals/EditConfigModal';
import DecommissionModal from './modals/DecommissionModal';

const { Text } = Typography;

const TEAM_EMOJIS: Record<string, string> = {
  Fire: '🚒',
  Ambulance: '🚑',
  Police: '🚓',
  Rescue: '🚁',
};

const STATUS_COLORS: Record<string, string> = {
  deployed: '#2563eb',
  enroute: '#ea580c',
  onscene: '#dc2626',
  available: '#059669',
  maintenance: '#6b7280',
};

// FALLBACK DUMMY DATA — remove or replace when API is live
const CREW_MEMBERS = [
  { name: 'Captain James Murphy', rank: 'Senior Captain', status: 'On Duty' },
  { name: "Officer Sarah O'Brien", rank: 'Senior Responder', status: 'On Duty' },
  { name: 'Officer Michael Walsh', rank: 'Responder', status: 'On Duty' },
  { name: 'Officer Emma Kelly', rank: 'Medic Specialist', status: 'On Duty' },
];

const STAT_ITEMS = [
  { label: 'Crew Size', key: 'crewSize' as const },
  { label: 'Deployments', value: '1,234' },
  { label: 'Avg Response', value: '4m 30s' },
  { label: 'Health', value: '98%', green: true },
];

interface TeamDetailsPageProps {
  team: EmergencyTeam;
  onBack: () => void;
  onRefresh: () => void;
}

const TeamDetailsPage: React.FC<TeamDetailsPageProps> = ({ team, onBack, onRefresh }) => {
  const [deployOpen, setDeployOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [decommissionOpen, setDecommissionOpen] = useState(false);

  const statusColor = STATUS_COLORS[team.statusType] || '#6b7280';
  const emoji = TEAM_EMOJIS[team.type] || '🚒';

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', fontSize: 14, fontWeight: 500, padding: '4px 8px',
            borderRadius: 8,
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 14 }} />
        </button>
        <div>
          <Text strong style={{ fontSize: 20, display: 'block' }}>Unit {team.unitId} Details</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>Comprehensive profile and history</Text>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        {/* Left column */}
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {emoji}
                </div>
                <div>
                  <Text strong style={{ fontSize: 18 }}>{team.type} Response Unit</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>Station: {team.station}</Text>
                </div>
              </div>
              <Tag
                style={{
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '4px 12px',
                }}
              >
                {team.status}
              </Tag>
            </div>

            {/* Stats grid */}
            <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
              {STAT_ITEMS.map(({ label, key, value, green }) => (
                <Col xs={12} sm={6} key={label}>
                  <div style={{ padding: 14, background: '#f9fafb', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      {label}
                    </Text>
                    <Text strong style={{ fontSize: 18, color: green ? '#16a34a' : '#111827' }}>
                      {key ? team[key] : value}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>

            {/* Crew roster */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <TeamOutlined style={{ color: '#374151', fontSize: 16 }} />
                <Text strong>Current Crew Roster</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CREW_MEMBERS.map((member, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: '1px solid #f3f4f6',
                      borderRadius: 8,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar size={32} style={{ background: '#7c3aed', fontSize: 12 }}>
                        {getInitials(member.name)}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{member.name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>Rank: {member.rank}</Text>
                      </div>
                    </div>
                    <Tag style={{ background: '#f0fdf4', color: '#16a34a', border: 0, borderRadius: 20, fontSize: 11 }}>
                      {member.status}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* Right column */}
        <Col xs={24} lg={8}>
          <Card
            title="Quick Actions"
            style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
            styles={{ header: { fontWeight: 700, borderBottom: '1px solid #f3f4f6' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <Button
                block
                type="primary"
                icon={<SendOutlined />}
                size="large"
                style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={() => setDeployOpen(true)}
              >
                Deploy Unit
              </Button>
              <Button
                block
                icon={<SettingOutlined />}
                size="large"
                onClick={() => setEditOpen(true)}
              >
                Edit Configuration
              </Button>
              <Button
                block
                icon={<CloseCircleOutlined />}
                size="large"
                onClick={() => setDecommissionOpen(true)}
                style={{
                  color: '#ef4444',
                  borderColor: '#fecaca',
                  background: '#fff',
                  fontWeight: 500,
                }}
              >
                Decommission Unit
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <DeployUnitModal
        open={deployOpen}
        unitId={team.unitId}
        unitType={team.type}
        station={team.station}
        onClose={() => setDeployOpen(false)}
        onSuccess={() => { setDeployOpen(false); onRefresh(); }}
      />
      <EditConfigModal
        open={editOpen}
        unitId={team.unitId}
        unitType={team.type}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh(); }}
      />
      <DecommissionModal
        open={decommissionOpen}
        unitId={team.unitId}
        unitType={team.type}
        station={team.station}
        yearsInService={8}
        totalDeployments={1234}
        lastDeployment="2 days ago"
        onClose={() => setDecommissionOpen(false)}
        onSuccess={() => { setDecommissionOpen(false); onBack(); onRefresh(); }}
      />
    </div>
  );
};

export default TeamDetailsPage;