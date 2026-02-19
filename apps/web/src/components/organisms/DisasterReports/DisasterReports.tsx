// MODIFIED FILE — changes: Wired DispatchUnitsModal replacing inline Modal.confirm dispatch;
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
  Badge,
  Progress,
  message,
  Spin,
  Empty,
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
  AppstoreOutlined,
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
  const [view, setView] = useState<'list' | 'map' | 'kanban'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('today');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchText, setSearchText] = useState('');

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
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((r) => r.severity === selectedSeverity);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter((r) => r.type === selectedType);
    }
    if (searchText) {
      filtered = filtered.filter(
        (r) =>
          r.reportId.toLowerCase().includes(searchText.toLowerCase()) ||
          r.location.toLowerCase().includes(searchText.toLowerCase()) ||
          r.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFilteredReports(filtered);
  }, [reports, selectedSeverity, selectedType, searchText]);

  useEffect(() => {
    filterReports();
  }, [filterReports]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getDisasterReports();
      if (response.data) {
        setReports(response.data);
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
    fire: <FireOutlined style={{ color: '#ef4444', fontSize: 20 }} />,
    flood: <CloudOutlined style={{ color: '#3b82f6', fontSize: 20 }} />,
    accident: <WarningOutlined style={{ color: '#f97316', fontSize: 20 }} />,
    storm: <ThunderboltOutlined style={{ color: '#6b7280', fontSize: 20 }} />,
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

  const criticalCount = reports.filter((r) => r.severity === 'critical').length;
  const activeCount = reports.filter((r) => r.severity === 'high' || r.severity === 'medium').length;
  const resolvedCount = reports.filter((r) => r.responseStatus >= 90).length;

  // ─── Sub-page renders ────────────────────────────────────────────────────────

  if (currentView === 'photos' && selectedReport) {
    return (
      <PhotoGallery
        report={selectedReport}
        onBack={() => setCurrentView('list')}
      />
    );
  }

  if (currentView === 'logs' && selectedReport) {
    return (
      <LogUpdates
        report={selectedReport}
        onBack={() => setCurrentView('list')}
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
            <Button
              type={view === 'kanban' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setView('kanban')}
              style={view === 'kanban' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
            >
              Kanban
            </Button>
          </Button.Group>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="filter-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Button.Group>
              <Button
                type={selectedTimeFilter === 'today' ? 'primary' : 'default'}
                onClick={() => setSelectedTimeFilter('today')}
                style={selectedTimeFilter === 'today' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
              >
                Today
              </Button>
              <Button
                type={selectedTimeFilter === '7days' ? 'primary' : 'default'}
                onClick={() => setSelectedTimeFilter('7days')}
                style={selectedTimeFilter === '7days' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
              >
                7 Days
              </Button>
            </Button.Group>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Severity</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="low">Low</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="fire">Fire</Select.Option>
              <Select.Option value="flood">Flood</Select.Option>
              <Select.Option value="accident">Accident</Select.Option>
              <Select.Option value="storm">Storm</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
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
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
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
                            strokeColor="#7c3aed"
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
                              danger
                              icon={<ExclamationCircleOutlined />}
                              block
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

      {/* Kanban View */}
      {view === 'kanban' && (
        <Row gutter={16} className="kanban-view">
          {['Reported', 'Assessing', 'Active Response', 'Resolved'].map((status, idx) => (
            <Col xs={24} sm={12} lg={6} key={status}>
              <Card className="kanban-column" size="small">
                <div className="kanban-header">
                  <span className="kanban-title">{status}</span>
                  <Badge count={idx + 1} style={{ backgroundColor: '#7c3aed' }} />
                </div>
                <div className="kanban-items">
                  {filteredReports.slice(idx, idx + 1).map((report) => (
                    <Card key={report.id} className="kanban-item" size="small">
                      <div className="kanban-item-header">
                        {typeIcons[report.type]}
                        <span className="kanban-item-id">{report.reportId}</span>
                      </div>
                      <p className="kanban-item-description">{report.description}</p>
                      <Tag color={severityColors[report.severity]} className="kanban-item-tag">
                        {severityLabels[report.severity]}
                      </Tag>
                    </Card>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
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
    </div>
  );
};

export default DisasterReports;
