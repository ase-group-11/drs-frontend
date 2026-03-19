// NEW FILE
import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Tag,
  Typography,
  Spin,
  message,
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
  deployed: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  available: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  onscene: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  maintenance: { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
  enroute: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
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
    const matchSearch =
      !searchQuery ||
      t.unitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unitName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
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
        onBack={() => setDetailTeam(null)}
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
          <div className={styles.headerMeta}>
            <span className={styles.metaTotal}>{meta?.total_count ?? teams.length} Total Teams</span>
            <span className={styles.metaDivider} />
            <span className={styles.metaActive}>
              <span className={styles.dotGreen} />
              {meta?.active_count ?? teams.filter(t => t.statusType === 'available').length} Active
            </span>
            <span className={styles.metaDivider} />
            <span className={styles.metaDeployed}>
              <span className={styles.dotBlue} />
              {meta?.deployed_count ?? teams.filter(t => t.statusType === 'deployed').length} Deployed
            </span>
          </div>
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
        <div className={styles.searchWrap}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Search unit ID or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
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