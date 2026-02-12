// File: /web/src/components/organisms/Dashboard/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, Table, Tag, Statistic, message, Spin } from 'antd';
import {
  UserOutlined,
  AlertOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  getDashboardStats,
  getTrendData,
  getDistributionData,
  getActivityLogs,
  getSystemAlerts,
} from '../../../services';
import type {
  DashboardStats,
  TrendDataPoint,
  DistributionDataPoint,
  ActivityLog,
  SystemAlert,
} from '../../../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionDataPoint[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [trendPeriod, setTrendPeriod] = useState(7);

  useEffect(() => {
    fetchDashboardData();
  }, [trendPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, distributionRes, activityRes, alertsRes] = await Promise.all([
        getDashboardStats(),
        getTrendData(trendPeriod),
        getDistributionData(),
        getActivityLogs(),
        getSystemAlerts(),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (trendRes.data) setTrendData(trendRes.data);
      if (distributionRes.data) setDistributionData(distributionRes.data);
      if (activityRes.data) setActivityLogs(activityRes.data);
      if (alertsRes.data) setSystemAlerts(alertsRes.data);
    } catch (error) {
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 80,
      render: (time: string) => <span className="activity-time">{time}</span>,
    },
    {
      title: 'Activity',
      dataIndex: 'activity',
      key: 'activity',
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ActivityLog) => (
        <Tag color={record.statusColor}>{status}</Tag>
      ),
    },
  ];

  const totalReports = distributionData.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-purple">
            <div className="stat-icon-wrapper stat-icon-purple">
              <UserOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{stats?.totalUsers?.toLocaleString()}</div>
              <div className="stat-change stat-change-positive">
                <ArrowUpOutlined />
                <span>+{stats?.totalUsersChange} this month</span>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-red">
            <div className="stat-icon-wrapper stat-icon-red">
              <AlertOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Active Disasters</div>
              <div className="stat-value">{stats?.activeDisasters}</div>
              <div className="stat-detail">{stats?.criticalDisasters} critical</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-blue">
            <div className="stat-icon-wrapper stat-icon-blue">
              <TeamOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Emergency Teams</div>
              <div className="stat-value">{stats?.emergencyTeams}</div>
              <div className="stat-detail">{stats?.activeTeams} active</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-green">
            <div className="stat-icon-wrapper stat-icon-green">
              <ThunderboltOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">System Status</div>
              <div className="stat-value stat-status">{stats?.systemStatus}</div>
              <div className="stat-detail">Uptime: {stats?.uptime}%</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="dashboard-charts">
        <Col xs={24} lg={15}>
          <Card
            title="Disaster Reports Trends"
            extra={
              <Select
                value={trendPeriod}
                onChange={setTrendPeriod}
                style={{ width: 140 }}
              >
                <Select.Option value={7}>Last 7 Days</Select.Option>
                <Select.Option value={30}>Last 30 Days</Select.Option>
                <Select.Option value={90}>Last 90 Days</Select.Option>
              </Select>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                  name="Total Reports"
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#colorCritical)"
                  name="Critical"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Disaster Distribution">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value, entry: any) => (
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="total-reports">
              <div className="total-reports-value">{totalReports}</div>
              <div className="total-reports-label">Total Reports</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[16, 16]} className="dashboard-bottom">
        <Col xs={24} lg={16}>
          <Card
            title="Recent System Activity"
            extra={<a href="#" className="view-all-link">View All</a>}
          >
            <Table
              columns={activityColumns}
              dataSource={activityLogs}
              pagination={false}
              rowKey="time"
              className="activity-table"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <div className="sidebar-cards">
            <Card title="Quick Actions" className="quick-actions-card">
              <div className="quick-actions-grid">
                <Button className="quick-action-btn quick-action-purple">
                  <PlusOutlined />
                  <span>New User</span>
                </Button>
                <Button className="quick-action-btn quick-action-blue">
                  <FileTextOutlined />
                  <span>Report</span>
                </Button>
                <Button className="quick-action-btn quick-action-red">
                  <BellOutlined />
                  <span>Alert</span>
                </Button>
                <Button className="quick-action-btn quick-action-gray">
                  <SettingOutlined />
                  <span>Config</span>
                </Button>
              </div>
            </Card>

            <Card title="System Alerts" className="system-alerts-card">
              <div className="system-alerts-list">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`alert-item alert-${alert.severity}`}
                  >
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-description">{alert.description}</div>
                  </div>
                ))}
                <Button type="link" className="view-all-alerts">
                  View All Alerts →
                </Button>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
