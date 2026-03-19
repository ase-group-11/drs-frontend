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
  Progress,
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
  PictureOutlined,
  FileTextOutlined,
  RocketOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  EnvironmentFilled,
  SearchOutlined,
} from '@ant-design/icons';
import { getDisasterReports, updateDisasterReportStatus } from '../../../services';
import type { DisasterReport } from '../../../types';
import MapView from './MapView';
import DispatchUnitsModal from './DispatchUnitsModal';
import EscalateSeverityModal from './EscalateSeverityModal';
import PhotoGallery from './PhotoGallery';
import LogUpdates from './LogUpdates';
import './DisasterReports.css';

const { Search } = Input;

type DisasterView = 'list' | 'photos' | 'logs';

const DisasterReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<DisasterReport[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('active');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [summary, setSummary] = useState<{ critical: number; active: number; resolved: number; monitoring: number; archived: number } | null>(null);

  // Sub-page navigation
  const [currentView, setCurrentView] = useState<DisasterView>('list');
  const [selectedReport, setSelectedReport] = useState<DisasterReport | null>(null);

  // Modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [activeModalReport, setActiveModalReport] = useState<DisasterReport | null>(null);

  useEffect(() => {
    fetchReports();
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
  }, [reports, selectedSeverity, selectedType, searchText, selectedTimeFilter]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

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

  const handleMarkResolved = async (report: DisasterReport) => {
    try {
      const response = await updateDisasterReportStatus(report.id, 'resolved');
      if (response.success) {
        message.success('Report marked as resolved');
        fetchReports();
      } else {
        message.error(response.message);
      }
    } catch {
      message.error('Failed to update report status');
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

  const openPhotoGallery = (report: DisasterReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReport(report);
    setCurrentView('photos');
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

  const criticalCount = summary?.critical ?? reports.filter((r) => r.severity === 'critical').length;
  const activeCount = summary ? (summary.active + summary.monitoring) : reports.filter((r) => r.disasterStatus === 'ACTIVE' || r.disasterStatus === 'MONITORING').length;
  const resolvedCount = summary?.resolved ?? reports.filter((r) => r.disasterStatus === 'RESOLVED').length;

  // ─── Sub-page renders ────────────────────────────────────────────────────────

  if (currentView === 'photos' && selectedReport) {
    return <PhotoGallery report={selectedReport} onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'logs' && selectedReport) {
    return <LogUpdates report={selectedReport} onBack={() => setCurrentView('list')} />;
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
          <div className="status-summary">
            <span className="status-item status-critical">
              <span className="status-dot" />
              {criticalCount} Critical
            </span>
            <span className="status-item status-active">
              <span className="status-dot" />
              {activeCount} Active
            </span>
            <span className="status-item status-resolved">
              <span className="status-dot" />
              {resolvedCount} Resolved
            </span>
          </div>
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

      {/* Filter Bar */}
      <Card className="filter-card">
        <Row gutter={[16, 16]} align="middle" style={{ flexWrap: 'nowrap' }}>
          <Col flex="none">
            <Space size={8}>
              <Button
                type={selectedTimeFilter === 'active' ? 'primary' : 'default'}
                onClick={() => setSelectedTimeFilter('active')}
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

          <Col flex="180px">
            <Select value={selectedSeverity} onChange={setSelectedSeverity} style={{ width: '100%' }} popupClassName="dr-filter-dropdown">
              <Select.Option value="all">All Severity</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
          </Col>

          <Col flex="180px">
            <Select value={selectedType} onChange={setSelectedType} style={{ width: '100%' }} popupClassName="dr-filter-dropdown">
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="fire">Fire</Select.Option>
              <Select.Option value="flood">Flood</Select.Option>
              <Select.Option value="accident">Accident</Select.Option>
              <Select.Option value="storm">Storm</Select.Option>
            </Select>
          </Col>

          <Col flex="auto">
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
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <div className="expanded-section">
                          <h4 className="section-title">Description</h4>
                          <p className="section-content">{report.description}</p>

                          <div className="section-buttons">
                            <Button
                              icon={<PictureOutlined />}
                              size="small"
                              onClick={(e) => openPhotoGallery(report, e)}
                            >
                              View Photos
                            </Button>
                            <Button
                              icon={<FileTextOutlined />}
                              size="small"
                              onClick={(e) => openLogUpdates(report, e)}
                            >
                              Log Update
                            </Button>
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} md={8}>
                        <Card className="status-card" size="small">
                          <h4 className="section-title">Response Status</h4>
                          <Progress
                            percent={report.responseStatus}
                            strokeColor="#10b981"
                            className="status-progress"
                          />
                          <div className="status-steps">
                            <div className="status-step status-completed">
                              <CheckCircleOutlined style={{ color: '#10b981' }} />
                              <span>Units dispatched</span>
                            </div>
                            <div className="status-step status-completed">
                              <CheckCircleOutlined style={{ color: '#10b981' }} />
                              <span>On scene assessment</span>
                            </div>
                            <div className="status-step status-in-progress">
                              <ExclamationCircleOutlined style={{ color: '#f97316' }} />
                              <span>Active response in progress</span>
                            </div>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} md={8}>
                        <div className="expanded-section">
                          <h4 className="section-title">Admin Actions</h4>
                          <div className="admin-actions">
                            <Button
                              type="primary"
                              icon={<RocketOutlined />}
                              block
                              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                              onClick={(e) => openDispatchModal(report, e)}
                            >
                              Dispatch Additional Units
                            </Button>
                            <Button
                              type="primary"
                              icon={<ExclamationCircleOutlined />}
                              block
                              style={{ background: '#e11d48', borderColor: '#e11d48' }}
                              onClick={(e) => openEscalateModal(report, e)}
                            >
                              Escalate Priority
                            </Button>
                            <Button
                              icon={<CheckCircleOutlined />}
                              block
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkResolved(report);
                              }}
                            >
                              Mark as Resolved
                            </Button>
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
      {view === 'map' && <MapView reports={filteredReports} />}

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
    </div>
  );
};

export default DisasterReports;