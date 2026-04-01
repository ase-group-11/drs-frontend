import React, { useEffect, useState } from 'react';
import { Button, Spin, Empty, Typography, Avatar } from 'antd';
import { ArrowLeftOutlined, PhoneOutlined, MailOutlined, UserOutlined, EnvironmentOutlined, CarOutlined } from '@ant-design/icons';
import { getEmergencyUnitById } from '../../../services';
import type { DisasterReport } from '../../../types';
import type { EmergencyUnitDetail } from '../../../types/emergency-teams.types';
import './LogUpdates.css';

const { Text } = Typography;

interface DeployedUnitsProps {
  report: DisasterReport;
  onBack: () => void;
}

const UNIT_TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  FIRE_ENGINE:    { emoji: '🔥', label: 'Fire Engine',    color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  AMBULANCE:      { emoji: '🚑', label: 'Ambulance',      color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  PATROL_CAR:     { emoji: '🚔', label: 'Patrol Car',     color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
  RESCUE:         { emoji: '⛑️', label: 'Rescue',         color: '#065f46', bg: '#f0fdf4', border: '#bbf7d0' },
  HAZMAT:         { emoji: '☢️', label: 'Hazmat',         color: '#7c2d12', bg: '#fff7ed', border: '#fed7aa' },
  RAPID_RESPONSE: { emoji: '⚡', label: 'Rapid Response', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  COMMAND:        { emoji: '📡', label: 'Command',        color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
};

const DEPT_COLOR: Record<string, string> = {
  FIRE: '#ef4444', MEDICAL: '#3b82f6', POLICE: '#8b5cf6', IT: '#6b7280',
};

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ACTIVE:         { color: '#16a34a', bg: '#dcfce7' },
  INACTIVE:       { color: '#6b7280', bg: '#f3f4f6' },
  DEPLOYED:       { color: '#d97706', bg: '#fef3c7' },
  DECOMMISSIONED: { color: '#dc2626', bg: '#fee2e2' },
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
    <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginRight: 12 }}>{label}</Text>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'right', wordBreak: 'break-word', maxWidth: '65%' }}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 6px', marginTop: 4 }}>
    <span style={{ fontSize: 13, color: '#9ca3af' }}>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
  </div>
);

const UnitCard: React.FC<{ unit: EmergencyUnitDetail }> = ({ unit }) => {
  const cfg = UNIT_TYPE_CONFIG[unit.unit_type] ?? { emoji: '🚨', label: unit.unit_type, color: '#374151', bg: '#f9fafb', border: '#e5e7eb' };
  const statusCfg = STATUS_CFG[(unit.unit_status ?? '').toUpperCase()] ?? STATUS_CFG.ACTIVE;
  const deptColor = DEPT_COLOR[unit.department] ?? '#6b7280';

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* color top bar */}
      <div style={{ height: 3, background: cfg.color }} />

      <div style={{ padding: '16px 18px' }}>

        {/* ── Identity ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {cfg.emoji}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{unit.unit_code}</div>
              <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</div>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {unit.unit_status}
          </span>
        </div>

        {unit.unit_name && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>{unit.unit_name}</Text>
        )}

        {/* ── Stats chips ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 70px', background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Crew</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{unit.stats.crew_count}/{unit.stats.capacity}</div>
          </div>
          <div style={{ flex: '1 1 70px', background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Deployments</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{unit.stats.total_deployments}</div>
          </div>
          <div style={{ flex: '1 1 70px', background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>Dept</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: deptColor }}>{unit.department}</div>
          </div>
        </div>

        {/* ── Commander ── */}
        {unit.commander?.id && unit.commander?.name && (
          <>
            <SectionHeader icon={<UserOutlined />} title="Commander" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', borderRadius: 10, padding: '10px 12px' }}>
              <Avatar size={34} style={{ background: '#7c3aed', flexShrink: 0, fontSize: 14 }}>
                {unit.commander.name.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{unit.commander.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {unit.commander.phone && (
                    <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PhoneOutlined style={{ fontSize: 10, flexShrink: 0 }} />{unit.commander.phone}
                    </span>
                  )}
                  {unit.commander.email && (
                    <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MailOutlined style={{ fontSize: 10, flexShrink: 0 }} />{unit.commander.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Station ── */}
        {unit.station && (
          <>
            <SectionHeader icon={<EnvironmentOutlined />} title="Station" />
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 12px' }}>
              <DetailRow label="Name" value={unit.station.name} />
              {unit.station.address && <DetailRow label="Address" value={unit.station.address} />}
            </div>
          </>
        )}

        {/* ── Vehicle ── */}
        {unit.vehicle && (
          <>
            <SectionHeader icon={<CarOutlined />} title="Vehicle" />
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '4px 12px' }}>
              <DetailRow label="Model" value={unit.vehicle.model} />
              <DetailRow label="Plate" value={<span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{unit.vehicle.license_plate}</span>} />
              <DetailRow label="Year" value={unit.vehicle.year} />
            </div>
          </>
        )}

        {/* ── Crew Roster ── */}
        {unit.crew_roster?.length > 0 && (
          <>
            <SectionHeader icon={<UserOutlined />} title={`Crew Roster (${unit.crew_roster.length})`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unit.crew_roster.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f9fafb', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Avatar size={26} icon={<UserOutlined />} style={{ background: '#e5e7eb', color: '#9ca3af', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{member.role} · {member.department}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8, background: member.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6', color: member.status === 'ACTIVE' ? '#16a34a' : '#6b7280' }}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DeployedUnits: React.FC<DeployedUnitsProps> = ({ report, onBack }) => {
  const [units, setUnits] = useState<(EmergencyUnitDetail | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  useEffect(() => {
    if (!report.deployedUnits?.length) { setLoading(false); return; }
    Promise.all(report.deployedUnits.map(id => getEmergencyUnitById(id)))
      .then(results => { setUnits(results); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, report.deployedUnits?.join(',')]);

  const validUnits = units.filter(Boolean) as EmergencyUnitDetail[];

  return (
    <div className="log-container">
      <div className="log-header">
        <div className="log-title-row">
          <div className="log-title-left">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack} className="log-back-btn" />
            <div>
              <h1 className="log-title">Deployed Units</h1>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {report.reportId} · {report.location}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: '0 24px 24px', background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text strong style={{ fontSize: 15, color: '#111827' }}>Assigned Units</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>({report.units} unit{report.units !== 1 ? 's' : ''})</Text>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : validUnits.length === 0 ? (
          <Empty description="No unit details available" style={{ padding: '40px 0' }} />
        ) : (
          <>
            <style>{`
              .du-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 16px;
              }
              @media (max-width: 640px) {
                .du-grid { grid-template-columns: 1fr; }
              }
            `}</style>
            <div className="du-grid">
              {validUnits.map(unit => <UnitCard key={unit.id} unit={unit} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeployedUnits;