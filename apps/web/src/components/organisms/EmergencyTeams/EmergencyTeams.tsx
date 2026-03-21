// NEW FILE
import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Tag,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Select,
} from 'antd';
import {
  TruckOutlined,
  SearchOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MessageOutlined,
  RightOutlined,
  FireOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { getTeams } from '../../../services';
import type { EmergencyTeam } from '../../../types';
import ContactModal from './modals/ContactModal';
import MessageModal from './modals/MessageModal';
import CreateTeamModal from './modals/CreateTeamModal';
import TeamDetailsPage from './TeamDetailsPage';
import styles from './EmergencyTeams.module.css';

const { Text } = Typography;

const TYPE_CONFIG: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Fire: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  Ambulance: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  Police: { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  Rescue: { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
};

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  deployed:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  available:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  onscene:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  maintenance: { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  enroute:     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  returning:   { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  offline:     { bg: '#f1f5f9', text: '#374151', border: '#cbd5e1' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Fire: <FireOutlined />,
  Ambulance: <MedicineBoxOutlined />,
  Police: <SafetyOutlined />,
  Rescue: <TruckOutlined />,
};

const EmergencyTeams: React.FC = () => {
  const [teams, setTeams] = useState<EmergencyTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [meta, setMeta] = useState<{ total_count: number; active_count: number; deployed_count: number; by_department: Record<string, number> } | null>(null);

  // Modal states
  const [contactOpen, setContactOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<EmergencyTeam | null>(null);

  // Sub-page state
  const [detailTeam, setDetailTeam] = useState<EmergencyTeam | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await getTeams() as any;
      if (res.success && res.data) {
        setTeams(res.data);
        if (res.meta) setMeta(res.meta);
      } else {
        message.error(res.message || 'Failed to load teams');
      }
    } catch {
      message.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  // Department filter keys match API department values (FIRE, POLICE, MEDICAL, IT)
  const filteredTeams = teams.filter((t) => {
    const matchDept =
      selectedFilter === 'all' ||
      t.department.toUpperCase() === selectedFilter.toUpperCase();
    const matchStatus =
      selectedStatus === 'all' ||
      t.statusType === selectedStatus;
    const matchSearch =
      !searchQuery ||
      t.unitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unitName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  // Build dynamic counts from API meta or fall back to counting teams array
  const deptCount = (dept: string) =>
    meta?.by_department?.[dept] ?? teams.filter((t) => t.department === dept).length;

  const filterButtons = [
    { key: 'all',     label: `All Teams` },
    { key: 'FIRE',    label: `Fire (${deptCount('FIRE')})` },
    { key: 'MEDICAL', label: `Ambulance (${deptCount('MEDICAL')})` },
    { key: 'POLICE',  label: `Police (${deptCount('POLICE')})` },
    { key: 'IT',      label: `Rescue (${deptCount('IT')})` },
  ];

  const handleContact = (team: EmergencyTeam) => {
    setSelectedTeam(team);
    setContactOpen(true);
  };

  const handleMessage = (team: EmergencyTeam) => {
    setSelectedTeam(team);
    setMessageOpen(true);
  };

  const handleViewDetails = (team: EmergencyTeam) => {
    setDetailTeam(team);
  };

  // Show detail sub-page
  if (detailTeam) {
    return (
      <TeamDetailsPage
        team={detailTeam}
        onBack={() => { setDetailTeam(null); loadTeams(); }}
        onRefresh={loadTeams}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <Text className={styles.pageTitle}>Emergency Teams</Text>
        </div>
        <Button
          type="primary"
          icon={<TruckOutlined />}
          size="large"
          className={styles.addBtn}
          onClick={() => setCreateOpen(true)}
        >
          Add New Unit
        </Button>
      </div>

      {/* Summary Cards */}
      {(() => {
        const available   = teams.filter(t => t.statusType === 'available').length;
        const deployed    = teams.filter(t => t.statusType === 'deployed').length;
        const onScene     = teams.filter(t => t.statusType === 'onscene').length;
        const returning   = teams.filter(t => t.statusType === 'returning').length;
        const enroute     = teams.filter(t => t.statusType === 'enroute').length;
        const maintenance = teams.filter(t => t.statusType === 'maintenance').length;
        const offline     = teams.filter(t => t.statusType === 'offline').length;
        const totalCrew   = teams.reduce((sum, t) => sum + (t.crewCount ?? 0), 0);

        const cards = [
          {
            title: 'Fleet', color: '#7c3aed', main: meta?.total_count ?? teams.length, mainLabel: 'Total Units',
            rows: [
              { label: 'Fire',    value: meta?.by_department?.['FIRE']    ?? teams.filter(t => t.department === 'FIRE').length,    color: '#dc2626' },
              { label: 'Medical', value: meta?.by_department?.['MEDICAL'] ?? teams.filter(t => t.department === 'MEDICAL').length, color: '#2563eb' },
              { label: 'Police',  value: meta?.by_department?.['POLICE']  ?? teams.filter(t => t.department === 'POLICE').length,  color: '#7c3aed' },
              { label: 'Rescue',  value: meta?.by_department?.['IT']      ?? teams.filter(t => t.department === 'IT').length,      color: '#d97706' },
            ],
          },
          {
            title: 'Operational', color: '#059669', main: available, mainLabel: 'Available',
            rows: [
              { label: 'Deployed',  value: deployed,  color: '#2563eb' },
              { label: 'On Scene',  value: onScene,   color: '#dc2626' },
              { label: 'En Route',  value: enroute,   color: '#ea580c' },
              { label: 'Returning', value: returning, color: '#7c3aed' },
            ],
          },
          {
            title: 'Stand-by', color: '#6b7280', main: maintenance, mainLabel: 'Maintenance',
            rows: [
              { label: 'Offline', value: offline, color: '#374151' },
            ],
          },
          {
            title: 'Crew', color: '#0891b2', main: totalCrew, mainLabel: 'Total Personnel',
            rows: [
              { label: 'Active Deployments', value: deployed + onScene + enroute + returning, color: '#2563eb' },
            ],
          },
        ];

        return (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {cards.map((card) => (
              <Col xs={24} sm={12} lg={6} key={card.title}>
                <div style={{
                  background: '#fff', borderRadius: 10, padding: '14px 16px',
                  borderLeft: `4px solid ${card.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  height: '100%',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    {card.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.main}</span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{card.mainLabel}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {card.rows.map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        );
      })()}

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.typeFilters}>
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedFilter(key)}
              className={`${styles.filterBtn} ${selectedFilter === key ? styles.filterBtnActive : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.filterRight}>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 160 }}
            size="middle"
            popupClassName="et-status-dropdown"
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="available">Available</Select.Option>
            <Select.Option value="deployed">Deployed</Select.Option>
            <Select.Option value="onscene">On Scene</Select.Option>
            <Select.Option value="enroute">En Route</Select.Option>
            <Select.Option value="returning">Returning</Select.Option>
            <Select.Option value="maintenance">Maintenance</Select.Option>
            <Select.Option value="offline">Offline</Select.Option>
          </Select>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Search unit ID or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <Spin size="large" />
        </div>
      ) : (
        <div className={styles.teamsGrid}>
          {filteredTeams.map((team) => {
            const typeCfg = TYPE_CONFIG[team.type] || TYPE_CONFIG.Fire;
            const statusCfg = STATUS_CONFIG[team.statusType] || STATUS_CONFIG.available;
            const showEta =
              ['deployed', 'enroute', 'onscene'].includes(team.statusType) &&
              team.eta;
            const icon = TYPE_ICON[team.type];

            return (
              <div key={team.id} className={styles.teamCard}>
                {/* Card body */}
                <div className={styles.cardBody}>
                  <div className={styles.cardTopRow}>
                    <div className={styles.cardIdentity}>
                      <div
                        className={styles.typeIconWrap}
                        style={{ background: typeCfg.bg, color: typeCfg.text }}
                      >
                        {icon}
                      </div>
                      <div>
                        <Text className={styles.unitId}>{team.unitId}</Text>
                        <Text className={styles.stationName}>{team.station}</Text>
                      </div>
                    </div>
                    <Tag
                      className={styles.statusTag}
                      style={{
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      {team.status}
                    </Tag>
                  </div>

                  <div className={styles.cardStats}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>
                        <TeamOutlined style={{ marginRight: 4 }} />
                        Crew Size
                      </span>
                      <Text className={styles.statValue}>{team.crewSize}</Text>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                        Location
                      </span>
                      <Text className={styles.statValue} title={team.location}>
                        {team.location}
                      </Text>
                    </div>
                    {showEta && (
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          ETA
                        </span>
                        <Text className={styles.statValueEta}>{team.eta}</Text>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className={styles.cardFooter}>
                  <button
                    className={styles.footerAction}
                    onClick={() => handleContact(team)}
                  >
                    <PhoneOutlined style={{ fontSize: 13 }} />
                    <span>Contact</span>
                  </button>
                  <span className={styles.footerDivider} />
                  <button
                    className={styles.footerAction}
                    onClick={() => handleMessage(team)}
                  >
                    <MessageOutlined style={{ fontSize: 13 }} />
                    <span>Message</span>
                  </button>
                  <span className={styles.footerDivider} />
                  <button
                    className={`${styles.footerAction} ${styles.footerActionPurple}`}
                    onClick={() => handleViewDetails(team)}
                  >
                    <span>View Details</span>
                    <RightOutlined style={{ fontSize: 12 }} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredTeams.length === 0 && (
            <div className={styles.emptyState}>
              <TruckOutlined style={{ fontSize: 40, color: '#d1d5db', display: 'block', marginBottom: 12 }} />
              <Text type="secondary">No teams match your search</Text>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadTeams}
      />
      <ContactModal
        open={contactOpen}
        team={selectedTeam}
        onClose={() => setContactOpen(false)}
      />
      <MessageModal
        open={messageOpen}
        team={selectedTeam}
        onClose={() => setMessageOpen(false)}
      />
    </div>
  );
};

export default EmergencyTeams;