// NEW FILE
import React, { useState, useEffect } from 'react';
import { Button, Tag, Card, Avatar, Typography, Space, Row, Col, Spin, message, Descriptions } from 'antd';
import {
  ArrowLeftOutlined,
  TeamOutlined,
  SendOutlined,
  SettingOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  CarOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { EmergencyTeam, EmergencyUnitDetail } from '../../../types';
import { getTeamById } from '../../../services';
import DeployUnitModal from './modals/DeployUnitModal';
import EditConfigModal from './modals/EditConfigModal';
import DecommissionModal from './modals/DecommissionModal';

const { Text } = Typography;

const TEAM_EMOJIS: Record<string, string> = {
  Fire:      '🚒',
  Ambulance: '🚑',
  Police:    '🚓',
  Rescue:    '🚁',
};

const STATUS_COLORS: Record<string, string> = {
  deployed:    '#2563eb',
  enroute:     '#ea580c',
  onscene:     '#dc2626',
  available:   '#059669',
  maintenance: '#6b7280',
  returning:   '#7c3aed',
  offline:     '#374151',
};

interface TeamDetailsPageProps {
  team: EmergencyTeam;
  onBack: () => void;
  onRefresh: () => void;
}

const TeamDetailsPage: React.FC<TeamDetailsPageProps> = ({ team, onBack, onRefresh }) => {
  const [detail, setDetail] = useState<EmergencyUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deployOpen, setDeployOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [decommissionOpen, setDecommissionOpen] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [team.id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getTeamById(team.id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        message.error(res.message || 'Failed to load unit details');
      }
    } catch {
      message.error('Failed to load unit details');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = STATUS_COLORS[team.statusType] || '#6b7280';
  const emoji = TEAM_EMOJIS[team.type] || '🚒';

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatResponseTime = (val: string | null, secs: number | null) => {
    if (val) return val;
    if (secs) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}m ${s}s`;
    }
    return 'N/A';
  };

  const formatLastDeployed = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

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

          {/* Main unit card */}
          <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {emoji}
                </div>
                <div>
                  <Text strong style={{ fontSize: 18 }}>{detail?.unit_name || `${team.type} Response Unit`}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>Station: {detail?.station?.name || team.station}</Text>
                  {detail?.description && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{detail.description}</Text>
                  )}
                </div>
              </div>
              <Tag style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40`, borderRadius: 20, fontWeight: 600, fontSize: 13, padding: '4px 12px' }}>
                {team.status}
              </Tag>
            </div>

            {/* Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
              {[
                { label: 'CREW SIZE',     value: `${detail?.stats.crew_count ?? team.crewCount}/${detail?.stats.capacity ?? team.crewMax}`, highlight: false, fontSize: 18, ellipsis: false },
                { label: 'DEPLOYMENTS',   value: String(detail?.stats.total_deployments ?? 0),                                              highlight: false, fontSize: 18, ellipsis: false },
                { label: 'DISASTER TYPE', value: detail?.current_assignment?.disaster_type ?? 'N/A',                                         highlight: !!detail?.current_assignment, fontSize: 16, ellipsis: false },
                { label: 'LOCATION',      value: detail?.current_assignment?.location ?? 'N/A',                                              highlight: !!detail?.current_assignment, fontSize: 13, ellipsis: true  },
              ].map(({ label, value, highlight, fontSize, ellipsis: useEllipsis }) => (
                <Col xs={12} sm={6} key={label}>
                  <div style={{
                    padding: 14,
                    borderRadius: 8,
                    background: highlight ? '#eff6ff' : '#f9fafb',
                    border: highlight ? '1px solid #bfdbfe' : 'none',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      {label}
                    </Text>
                    <Text
                      strong
                      ellipsis={useEllipsis ? { tooltip: value } : false}
                      style={{ fontSize, color: highlight ? '#1d4ed8' : '#111827', display: 'block' }}
                    >
                      {value}
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
                <Text type="secondary" style={{ fontSize: 12 }}>({detail?.crew_roster?.length ?? 0} members)</Text>
              </div>
              {detail?.crew_roster && detail.crew_roster.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.crew_roster.map((member) => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #f3f4f6', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar size={32} style={{ background: '#7c3aed', fontSize: 12 }}>
                          {getInitials(member.name)}
                        </Avatar>
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{member.name}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{member.role} · {member.department}</Text>
                        </div>
                      </div>
                      <Tag style={{ background: member.status === 'ACTIVE' ? '#f0fdf4' : '#f9fafb', color: member.status === 'ACTIVE' ? '#16a34a' : '#6b7280', border: 0, borderRadius: 20, fontSize: 11 }}>
                        {member.status}
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>No crew members assigned</Text>
              )}
            </div>
          </Card>

          {/* Station info */}
          {detail?.station && (
            <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16 }}
              title={<span><EnvironmentOutlined style={{ marginRight: 8 }} />Station Information</span>}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Station Name">{detail.station.name}</Descriptions.Item>
                <Descriptions.Item label="Address">{detail.station.address}</Descriptions.Item>
                <Descriptions.Item label="Latitude">{detail.station.lat}</Descriptions.Item>
                <Descriptions.Item label="Longitude">{detail.station.lon}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Vehicle info */}
          {detail?.vehicle && (
            <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              title={<span><CarOutlined style={{ marginRight: 8 }} />Vehicle Information</span>}>
              <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Model">{detail.vehicle.model}</Descriptions.Item>
                <Descriptions.Item label="License Plate">{detail.vehicle.license_plate}</Descriptions.Item>
                <Descriptions.Item label="Year">{detail.vehicle.year}</Descriptions.Item>
              </Descriptions>
              {detail.vehicle.equipment?.length > 0 && (
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    <ToolOutlined style={{ marginRight: 6 }} />Equipment
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {detail.vehicle.equipment.map((eq, idx) => (
                      <Tag key={idx} style={{ background: eq.present ? '#f0fdf4' : '#fef2f2', color: eq.present ? '#16a34a' : '#dc2626', border: `1px solid ${eq.present ? '#bbf7d0' : '#fecaca'}`, borderRadius: 6 }}>
                        {eq.present ? '✓' : '✗'} {eq.item}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* Right column */}
        <Col xs={24} lg={8}>
          {/* Quick actions */}
          <Card title="Quick Actions" style={{ borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16 }}
            styles={{ header: { fontWeight: 700, borderBottom: '1px solid #f3f4f6' } }}>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {(() => {
                const status = detail?.unit_status ?? '';
                const activeStatuses = ['DEPLOYED', 'ON_SCENE', 'RETURNING'];
                const canDeploy   = status === 'AVAILABLE';
                const canEditDecommission = !activeStatuses.includes(status) && !!status;
                return (
                  <>
                    <Button block type="primary" icon={<SendOutlined />} size="large"
                      style={{
                        background: canDeploy ? '#7c3aed' : '#9ca3af',
                        borderColor: canDeploy ? '#7c3aed' : '#9ca3af',
                      }}
                      disabled={!canDeploy}
                      onClick={() => setDeployOpen(true)}
                    >
                      {status === 'DEPLOYED' || status === 'ON_SCENE' || status === 'RETURNING'
                        ? 'Currently Active'
                        : 'Deploy Unit'}
                    </Button>
                    <Button block icon={<SettingOutlined />} size="large"
                      disabled={!canEditDecommission}
                      onClick={() => setEditOpen(true)}>
                      Edit Configuration
                    </Button>
                    <Button block icon={<CloseCircleOutlined />} size="large"
                      disabled={!canEditDecommission}
                      onClick={() => setDecommissionOpen(true)}
                      style={canEditDecommission ? { color: '#ef4444', borderColor: '#fecaca', background: '#fff', fontWeight: 500 } : {}}>
                      Decommission Unit
                    </Button>
                  </>
                );
              })()}
            </Space>
          </Card>

          {/* Commander */}
          {detail?.commander && (
            <Card title={<span><UserOutlined style={{ marginRight: 8 }} />Commander</span>}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar size={40} style={{ background: '#7c3aed', fontSize: 14 }}>
                  {getInitials(detail.commander.name)}
                </Avatar>
                <Text strong>{detail.commander.name}</Text>
              </div>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PhoneOutlined style={{ color: '#6b7280', fontSize: 13 }} />
                  <Text style={{ fontSize: 13 }}>{detail.commander.phone}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MailOutlined style={{ color: '#6b7280', fontSize: 13 }} />
                  <Text style={{ fontSize: 13 }}>{detail.commander.email}</Text>
                </div>
              </Space>
            </Card>
          )}

          {/* Deployment info */}
          <Card title="Deployment Info" style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
            styles={{ header: { fontWeight: 700, borderBottom: '1px solid #f3f4f6' } }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Total Deployments</Text>
                <Text strong style={{ fontSize: 13 }}>{detail?.stats.total_deployments ?? 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Last Deployed</Text>
                <Text strong style={{ fontSize: 13 }}>{formatLastDeployed(detail?.stats.last_deployed_at ?? null)}</Text>
              </div>

              {detail?.current_assignment ? (
                <>
                  <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Current Assignment</Text>
                    <Tag color="blue" style={{ fontSize: 11 }}>{detail.current_assignment.deployment_status}</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Disaster ID</Text>
                    <Text strong style={{ fontSize: 12, color: '#2563eb' }}>{detail.current_assignment.disaster_tracking_id}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Disaster Type</Text>
                    <Text strong style={{ fontSize: 13 }}>{detail.current_assignment.disaster_type}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13, flexShrink: 0 }}>Location</Text>
                    <Text strong style={{ fontSize: 12, textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{detail.current_assignment.location}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Dispatched At</Text>
                    <Text strong style={{ fontSize: 12 }}>{formatLastDeployed(detail.current_assignment.dispatched_at)}</Text>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Current Assignment</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>None</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <DeployUnitModal
        open={deployOpen} unitId={team.unitId} unitUuid={team.id} unitType={team.type} station={team.station}
        onClose={() => setDeployOpen(false)}
        onSuccess={() => { setDeployOpen(false); fetchDetail(); }}
      />
      <EditConfigModal
        open={editOpen} unitId={team.unitId} unitType={team.type}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh(); }}
      />
      <DecommissionModal
        open={decommissionOpen} unitId={team.unitId} unitUuid={team.id} unitType={team.type} station={team.station}
        totalDeployments={detail?.stats.total_deployments ?? 0}
        lastDeployment={formatLastDeployed(detail?.stats.last_deployed_at ?? null)}
        onClose={() => setDecommissionOpen(false)}
        onSuccess={() => { setDecommissionOpen(false); onBack(); }}
      />
    </div>
  );
};

export default TeamDetailsPage;