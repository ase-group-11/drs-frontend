// File: /web/src/components/organisms/DisasterReports/DisasterReports.tsx
// MODIFIED FILE — Kanban removed completely
//   wired DispatchUnitsModal replacing inline Modal.confirm dispatch;
//   wired EscalateSeverityModal replacing inline Modal.confirm escalation;
//   added PhotoGallery and LogUpdates sub-page navigation via currentView state

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Select,
  Input,
  Tag,
  message,
  Spin,
  Empty,
  Space,
} from 'antd';
import {
  FireOutlined,
  CloudOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  MoreOutlined,
  RocketOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  EnvironmentFilled,
  SearchOutlined,
} from '@ant-design/icons';
import { getDisasterReports } from '../../../services';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import type { DisasterReport } from '../../../types';
import MapView from './MapView';
import DispatchUnitsModal from './DispatchUnitsModal';
import EscalateSeverityModal from './EscalateSeverityModal';
import ResolveDisasterModal from './ResolveDisasterModal';
import PhotoGallery from './PhotoGallery';
import LogUpdates from './LogUpdates';
import DeployedUnits from './DeployedUnits';
import EvacuationPlanPage from './EvacuationPlanPage';
import './DisasterReports.css';

const { Search } = Input;

type DisasterView = 'list' | 'photos' | 'logs' | 'units' | 'evacuation';




const DisasterReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<DisasterReport[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('active');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [summary, setSummary] = useState<{ critical: number; active: number; resolved: number; monitoring: number; archived: number } | null>(null);

  // Sub-page navigation
  const [currentView, setCurrentView] = useState<DisasterView>('list');
  const [selectedReport, setSelectedReport] = useState<DisasterReport | null>(null);
  const [selectedEvacPlanId, setSelectedEvacPlanId] = useState<string | null>(null);

  // Evacuation plans: map of disaster_id → plan_id
  const [evacuationPlanMap, setEvacuationPlanMap] = useState<Record<string, string>>({});

  // Modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [activeModalReport, setActiveModalReport] = useState<DisasterReport | null>(null);

  useEffect(() => {
    fetchReports();
    fetchEvacuationPlans();
  }, []);

  const filterReports = useCallback(() => {
    let filtered = [...reports];

    // Active tab: ACTIVE + MONITORING statuses only
    // All tab: show everything
    if (selectedTimeFilter === 'active') {
      filtered = filtered.filter((r) =>
        r.disasterStatus === 'ACTIVE' || r.disasterStatus === 'MONITORING'
      );
    }
    // 'all' — no status filter, show everything

    // Status dropdown filter (only applies when 'all' tab or overrides)
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.disasterStatus === selectedStatus);
    }

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((r) => r.severity === selectedSeverity);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter((r) => r.type.toLowerCase() === selectedType.toLowerCase());
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reportId.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    setFilteredReports(filtered);
  }, [reports, selectedSeverity, selectedType, searchText, selectedTimeFilter, selectedStatus]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  const fetchEvacuationPlans = async () => {
    try {
      const res = await apiClient.get<{ evacuation_plans: { id: string; disaster_id: string }[]; count: number }>(
        API_ENDPOINTS.EVACUATIONS.LIST
      );
      const map: Record<string, string> = {};
      (res.data?.evacuation_plans ?? []).forEach((p) => {
        map[p.disaster_id] = p.id;
      });
      setEvacuationPlanMap(map);
    } catch {
      // silent — evacuation data is supplementary
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getDisasterReports() as any;
      if (response.success && response.data) {
        setReports(response.data);
        if (response.summary) setSummary(response.summary);
      } else {
        message.error(response.message || 'Failed to load disaster reports');
      }
    } catch {
      message.error('Failed to load disaster reports');
    } finally {
      setLoading(false);
    }
  };

  const openDispatchModal = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModalReport(report);
    setDispatchModalOpen(true);
  };

  const openEscalateModal = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveModalReport(report);
    setEscalateModalOpen(true);
  };

  useEffect(() => {
    if (currentView === 'photos' || currentView === 'logs') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentView]);

  const openPhotoGallery = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
    setCurrentView('photos');
  };

  const openDeployedUnits = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
    setCurrentView('units');
  };

  const openEvacuationPlan = (report: DisasterReport, planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
    setSelectedEvacPlanId(planId);
    setCurrentView('evacuation');
  };

  const openLogUpdates = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
    setCurrentView('logs');
  };

  const typeIcons: Record<string, React.ReactNode> = {
    FIRE:     <FireOutlined style={{ color: '#ef4444', fontSize: 20 }} />,
    FLOOD:    <CloudOutlined style={{ color: '#3b82f6', fontSize: 20 }} />,
    ACCIDENT: <WarningOutlined style={{ color: '#f97316', fontSize: 20 }} />,
    STORM:    <ThunderboltOutlined style={{ color: '#6b7280', fontSize: 20 }} />,
    // lowercase fallbacks
    fire:     <FireOutlined style={{ color: '#ef4444', fontSize: 20 }} />,
    flood:    <CloudOutlined style={{ color: '#3b82f6', fontSize: 20 }} />,
    accident: <WarningOutlined style={{ color: '#f97316', fontSize: 20 }} />,
    storm:    <ThunderboltOutlined style={{ color: '#6b7280', fontSize: 20 }} />,
  };

  const severityColors: Record<string, string> = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#3B82F6',
  };

  const severityLabels: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };

  const bySeverity = {
    critical: reports.filter((r) => r.severity === 'critical').length,
    high:     reports.filter((r) => r.severity === 'high').length,
    medium:   reports.filter((r) => r.severity === 'medium').length,
    low:      reports.filter((r) => r.severity === 'low').length,
  };
  const byStatus = {
    active:     summary?.active     ?? reports.filter((r) => r.disasterStatus === 'ACTIVE').length,
    monitoring: summary?.monitoring ?? reports.filter((r) => r.disasterStatus === 'MONITORING').length,
    resolved:   summary?.resolved   ?? reports.filter((r) => r.disasterStatus === 'RESOLVED').length,
    archived:   summary?.archived   ?? reports.filter((r) => r.disasterStatus === 'ARCHIVED').length,
  };
  const totalUnitsAssigned  = reports.reduce((sum, r) => sum + (r.units ?? 0), 0);
  const totalPeopleAffected = reports.reduce((sum, r) => sum + (r.peopleAffected ?? 0), 0);
  const totalReportsCount   = reports.length;

  const summaryCards = [
    {
      title: 'By Severity', color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
      main: bySeverity.critical, mainLabel: 'Critical',
      rows: [
        { label: 'High',   value: bySeverity.high,   color: '#ea580c' },
        { label: 'Medium', value: bySeverity.medium, color: '#d97706' },
        { label: 'Low',    value: bySeverity.low,    color: '#2563eb' },
      ],
    },
    {
      title: 'Active Now', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
      main: byStatus.active, mainLabel: 'Active',
      rows: [{ label: 'Monitoring', value: byStatus.monitoring, color: '#2563eb' }],
    },
    {
      title: 'Closed', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
      main: byStatus.resolved, mainLabel: 'Resolved',
      rows: [{ label: 'Archived', value: byStatus.archived, color: '#6b7280' }],
    },
    {
      title: 'Response', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
      main: totalUnitsAssigned, mainLabel: 'Units Deployed',
      rows: [
        { label: 'People Affected', value: totalPeopleAffected, color: '#374151' },
        { label: 'Total Reports',   value: totalReportsCount,   color: '#374151' },
      ],
    },
  ];

  // ─── Sub-page renders ────────────────────────────────────────────────────────

  if (currentView === 'photos' && selectedReport) {
    return <PhotoGallery report={selectedReport} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'logs' && selectedReport) {
    return <LogUpdates report={selectedReport} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'units' && selectedReport) {
    return <DeployedUnits report={selectedReport} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'evacuation' && selectedReport && selectedEvacPlanId) {
    return (
      <EvacuationPlanPage
        report={selectedReport}
        planId={selectedEvacPlanId}
        onBack={() => { setCurrentView('list'); setSelectedEvacPlanId(null); }}
      />
    );
  }

  // ─── Main list view ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="disaster-reports-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="disaster-reports-container">
      {/* Header */}
      <div className="disaster-reports-header">
        <div className="header-title-section">
          <h1 className="page-title">Disaster Reports</h1>
        </div>

        <div className="view-switcher">
          <Button.Group>
            <Button
              type={view === 'list' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => setView('list')}
              style={view === 'list' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
            >
              List
            </Button>
            <Button
              type={view === 'map' ? 'primary' : 'default'}
              icon={<EnvironmentFilled />}
              onClick={() => setView('map')}
              style={view === 'map' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
            >
              Map
            </Button>
          </Button.Group>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {summaryCards.map((card) => (
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

      {/* Filter Bar */}
      <Card className="filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col flex="none">
            <Space size={8}>
              <Button
                type={selectedTimeFilter === 'active' ? 'primary' : 'default'}
                onClick={() => { setSelectedTimeFilter('active'); setSelectedStatus('all'); }}
                style={
                  selectedTimeFilter === 'active'
                    ? { background: '#7c3aed', borderColor: '#7c3aed', borderRadius: 8 }
                    : { borderRadius: 8 }
                }
              >
                Active
              </Button>
              <Button
                type={selectedTimeFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setSelectedTimeFilter('all')}
                style={
                  selectedTimeFilter === 'all'
                    ? { background: '#7c3aed', borderColor: '#7c3aed', borderRadius: 8 }
                    : { borderRadius: 8 }
                }
              >
                All
              </Button>
            </Space>
          </Col>

          <Col flex="148px">
            <Select
              value={selectedStatus}
              onChange={(val) => { setSelectedStatus(val); if (val !== 'all') setSelectedTimeFilter('all'); }}
              style={{ width: '100%' }}
              popupClassName="dr-filter-dropdown"
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="ACTIVE">Active</Select.Option>
              <Select.Option value="MONITORING">Monitoring</Select.Option>
              <Select.Option value="RESOLVED">Resolved</Select.Option>
              <Select.Option value="ARCHIVED">Archived</Select.Option>
            </Select>
          </Col>

          <Col flex="148px">
            <Select value={selectedSeverity} onChange={setSelectedSeverity} style={{ width: '100%' }} popupClassName="dr-filter-dropdown">
              <Select.Option value="all">All Severity</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
          </Col>

          <Col flex="148px">
            <Select value={selectedType} onChange={setSelectedType} style={{ width: '100%' }} popupClassName="dr-filter-dropdown">
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="FIRE">Fire</Select.Option>
              <Select.Option value="FLOOD">Flood</Select.Option>
              <Select.Option value="ACCIDENT">Accident</Select.Option>
              <Select.Option value="STORM">Storm</Select.Option>
            </Select>
          </Col>

          <Col flex="auto" style={{ minWidth: 100 }}>
            <Search
              placeholder="Search reports..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* List View */}
      {view === 'list' && (
        <div className="reports-list">
          {filteredReports.length === 0 ? (
            <Empty description="No disaster reports found" style={{ padding: '60px 0' }} />
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                className="report-card"
                style={{ borderLeft: `4px solid ${severityColors[report.severity]}` }}
              >
                <div
                  className="report-summary"
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                >
                  <div className="report-main">
                    <div className="report-icon">{typeIcons[report.type]}</div>
                    <div className="report-info">
                      <div className="report-title-row">
                        <span className="report-title">{report.title}</span>
                        <span className="report-id">{report.reportId}</span>
                      </div>

                      <div className="report-details">
                        <div className="detail-item">
                          <EnvironmentOutlined />
                          <span>{report.location}</span>
                        </div>

                        <div className="detail-zone">{report.zone}</div>

                        <div className="detail-row">
                          <div className="detail-item">
                            <ClockCircleOutlined />
                            <span>{report.time}</span>
                          </div>
                          <div className="detail-item">
                            <TeamOutlined />
                            <span>Units: {report.units} assigned</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="report-actions-header">
                    <Tag color={severityColors[report.severity]} className="severity-tag">
                      {severityLabels[report.severity]}
                    </Tag>
                    <Button type="text" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === report.id ? null : report.id); }} />
                  </div>
                </div>

                {expandedId === report.id && (
                  <div className="report-expanded">
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={24} lg={8}>
                        <div className="expanded-section">
                          <h4 className="section-title">Description</h4>
                          <p className="section-content">{report.description}</p>

                          <div className="section-buttons">
                            <Button
                              size="small"
                              onClick={(e) => openPhotoGallery(report, e)}
                            >
                              🖼️ View Photos
                            </Button>
                            <Button
                              size="small"
                              onClick={(e) => openLogUpdates(report, e)}
                            >
                              📋 Disaster Logs
                            </Button>
                            {report.deployedUnits?.length > 0 && (
                              <Button
                                size="small"
                                onClick={(e) => openDeployedUnits(report, e)}
                              >
                                🚨 Deployed Units
                              </Button>
                            )}
                            {evacuationPlanMap[report.id] && (
                              <Button
                                size="small"
                                onClick={(e) => openEvacuationPlan(report, evacuationPlanMap[report.id], e)}
                              >
                                🚶 Evacuation Plan
                              </Button>
                            )}
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} sm={24} lg={8}>
                        <Card className="status-card" size="small">
                          <h4 className="section-title">Disaster Details</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>Status</span>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                background:
                                  report.disasterStatus === 'ACTIVE'     ? '#dcfce7' :
                                  report.disasterStatus === 'MONITORING' ? '#eff6ff' :
                                  report.disasterStatus === 'RESOLVED'   ? '#f3f4f6' :
                                  '#fef3c7', // ARCHIVED
                                color:
                                  report.disasterStatus === 'ACTIVE'     ? '#16a34a' :
                                  report.disasterStatus === 'MONITORING' ? '#2563eb' :
                                  report.disasterStatus === 'RESOLVED'   ? '#6b7280' :
                                  '#d97706', // ARCHIVED
                                whiteSpace: 'nowrap',
                              }}>
                                {report.disasterStatus}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>People Affected</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{report.peopleAffected ?? 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>Report Count</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{report.reportCount ?? 0}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>Coordinates</span>
                              <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {report.locationCoords
                                  ? `${report.locationCoords.lat}, ${report.locationCoords.lon}`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} sm={24} lg={8}>
                        <div className="expanded-section">
                          <h4 className="section-title">Admin Actions</h4>
                          <div className="admin-actions">
                            {(() => {
                              const isActionable = report.disasterStatus === 'ACTIVE' || report.disasterStatus === 'MONITORING';
                              return (
                                <>
                                  <Button
                                    type="primary"
                                    icon={<RocketOutlined />}
                                    block
                                    disabled={!isActionable}
                                    style={{ background: isActionable ? '#7c3aed' : undefined, borderColor: isActionable ? '#7c3aed' : undefined }}
                                    onClick={(e) => openDispatchModal(report, e)}
                                  >
                                    Dispatch Units
                                  </Button>
                                  <Button
                                    type="primary"
                                    icon={<ExclamationCircleOutlined />}
                                    block
                                    disabled={!isActionable}
                                    style={{ background: isActionable ? '#e11d48' : undefined, borderColor: isActionable ? '#e11d48' : undefined }}
                                    onClick={(e) => openEscalateModal(report, e)}
                                  >
                                    Escalate Priority
                                  </Button>
                                  <Button
                                    icon={<CheckCircleOutlined />}
                                    block
                                    disabled={!isActionable}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveModalReport(report);
                                      setResolveModalOpen(true);
                                    }}
                                  >
                                    Mark as Resolved
                                  </Button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Map View */}
      {view === 'map' && (
        <MapView
          reports={filteredReports}
          onDispatch={(report) => { setActiveModalReport(report); setDispatchModalOpen(true); }}
          onEscalate={(report) => { setActiveModalReport(report); setEscalateModalOpen(true); }}
          onResolve={(report)  => { setActiveModalReport(report); setResolveModalOpen(true); }}
          onViewPhotos={(report) => { setSelectedReport(report); setCurrentView('photos'); }}
          onViewLogs={(report)   => { setSelectedReport(report); setCurrentView('logs'); }}
          onViewDeployedUnits={(report) => { setSelectedReport(report); setCurrentView('units'); }}
          evacuationPlanMap={evacuationPlanMap}
          onViewEvacuationPlan={(report, planId) => { setSelectedReport(report); setSelectedEvacPlanId(planId); setCurrentView('evacuation'); }}
        />
      )}

      {/* Modals */}
      <DispatchUnitsModal
        open={dispatchModalOpen}
        report={activeModalReport}
        onClose={() => {
          setDispatchModalOpen(false);
          setActiveModalReport(null);
        }}
        onSuccess={fetchReports}
      />

      <EscalateSeverityModal
        open={escalateModalOpen}
        report={activeModalReport}
        onClose={() => {
          setEscalateModalOpen(false);
          setActiveModalReport(null);
        }}
        onSuccess={fetchReports}
      />

      <ResolveDisasterModal
        open={resolveModalOpen}
        report={activeModalReport}
        onClose={() => {
          setResolveModalOpen(false);
          setActiveModalReport(null);
        }}
        onSuccess={fetchReports}
      />
    </div>
  );
};

export default DisasterReports;