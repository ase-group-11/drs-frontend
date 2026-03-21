import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, Table, Tag, Spin, message } from 'antd';
import {
  UserOutlined, AlertOutlined, TeamOutlined, ThunderboltOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getActivityLogs } from '../../../services';
import apiClient from '../../../lib/axios';
import type { DashboardStats, ActivityLog, DisasterRaw, DisastersApiResponse } from '../../../types';
import './Dashboard.css';

const TYPE_COLORS: Record<string, string> = {
  FIRE:     '#EF4444',
  FLOOD:    '#3B82F6',
  ACCIDENT: '#F97316',
  STORM:    '#6B7280',
  OTHER:    '#EAB308',
};

const ACTIVE_UNIT_STATUSES = ['AVAILABLE', 'DEPLOYED', 'ON_SCENE', 'RETURNING'];

// Generate day buckets going back N days from today — returns {label, dateStr} pairs
const getDayBuckets = (days: number): { label: string; dateStr: string }[] => {
  const buckets: { label: string; dateStr: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // For 7 days use short label, for 30 use date number only to avoid weekday repeats
    const label = days <= 7
      ? d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
    buckets.push({ label, dateStr: d.toISOString().slice(0, 10) });
  }
  return buckets;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState(7);

  // KPI stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeDisasters, setActiveDisasters] = useState(0);
  const [criticalActiveDisasters, setCriticalActiveDisasters] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);
  const [activeTeams, setActiveTeams] = useState(0);

  // Chart data
  const [trendData, setTrendData] = useState<{ day: string; total: number; critical: number }[]>([]);
  const [distributionData, setDistributionData] = useState<{ name: string; value: number; color: string }[]>([]);

  // Activity / alerts
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [allDisasters, setAllDisasters] = useState<DisasterRaw[]>([]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute trend chart whenever period changes or disasters reload
  useEffect(() => {
    if (allDisasters.length === 0) return;
    const buckets = getDayBuckets(trendPeriod);
    const trend = buckets.map(({ label, dateStr }) => {
      const dayDisasters = allDisasters.filter((d) => d.created_at?.slice(0, 10) === dateStr);
      return {
        day: label,
        total: dayDisasters.length,
        critical: dayDisasters.filter((d) => d.severity === 'CRITICAL').length,
      };
    });
    setTrendData(trend);
  }, [trendPeriod, allDisasters]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, disastersRes, unitsRes] = await Promise.all([
        getDashboardStats(),
        getActivityLogs(),
        apiClient.get<DisastersApiResponse>('/disasters/all'),
        apiClient.get<{ units: { unit_status: string }[]; total_count: number; active_count: number }>('/emergency-units/'),
      ]);

      // ── KPI: existing stats (total users, system status) ──────────────────
      if (statsRes.data) setStats(statsRes.data);
      if (activityRes.data) setActivityLogs(activityRes.data);

      // ── KPI: Active Disasters from /disasters/all ─────────────────────────
      const disasters: DisasterRaw[] = disastersRes.data?.disasters ?? [];
      setAllDisasters(disasters);
      const activeDis = disasters.filter(
        (d) => d.disaster_status === 'ACTIVE' || d.disaster_status === 'MONITORING'
      );
      const criticalActive = activeDis.filter((d) => d.severity === 'CRITICAL').length;
      setActiveDisasters(activeDis.length);
      setCriticalActiveDisasters(criticalActive);

      // ── KPI: Emergency Teams from /emergency-units/ ───────────────────────
      const units = unitsRes.data?.units ?? [];
      setTotalTeams(unitsRes.data?.total_count ?? units.length);
      setActiveTeams(units.filter((u) => ACTIVE_UNIT_STATUSES.includes(u.unit_status)).length);

      // ── Chart: Disaster Distribution ──────────────────────────────────────
      const typeCounts: Record<string, number> = {};
      disasters.forEach((d) => {
        const key = d.type.toUpperCase();
        typeCounts[key] = (typeCounts[key] || 0) + 1;
      });
      const distData = Object.entries(typeCounts).map(([name, value]) => ({
        name: name.charAt(0) + name.slice(1).toLowerCase(),
        value,
        color: TYPE_COLORS[name] ?? '#9CA3AF',
      }));
      setDistributionData(distData);

    } catch {
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const activityColumns = [
    { title: 'Time', dataIndex: 'time', key: 'time', width: 80, render: (t: string) => <span className="activity-time">{t}</span> },
    { title: 'Activity', dataIndex: 'activity', key: 'activity' },
    { title: 'User', dataIndex: 'user', key: 'user' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string, r: ActivityLog) => <Tag color={r.statusColor}>{s}</Tag> },
  ];

  const totalReports = distributionData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return <div className="dashboard-loading"><Spin size="large" /></div>;
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
              <div className="stat-value">{stats?.totalUsers?.toLocaleString() ?? '—'}</div>
              <div className="stat-change stat-change-positive">
                <ArrowUpOutlined />
                <span>+{stats?.totalUsersChange ?? 0} this month</span>
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
              <div className="stat-value">{activeDisasters}</div>
              <div className="stat-detail">{criticalActiveDisasters} critical</div>
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
              <div className="stat-value">{totalTeams}</div>
              <div className="stat-detail">{activeTeams} active</div>
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
              <div className="stat-value stat-status">{stats?.systemStatus ?? 'Operational'}</div>
              <div className="stat-detail">Uptime: {stats?.uptime ?? 99.9}%</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="dashboard-charts">
        <Col xs={24} lg={15}>
          <Card
            title="Disaster Reports Trends"
            className="chart-card"
            extra={
              <Select value={trendPeriod} onChange={(v) => setTrendPeriod(v)} style={{ width: 140 }} popupClassName="chart-card-trends-dropdown">
                <Select.Option value={7}>Last 7 Days</Select.Option>
                <Select.Option value={30}>Last 30 Days</Select.Option>
              </Select>
            }
          >
            <div className="chart-fill chart-fill-trends">
              <ResponsiveContainer width="100%" height="100%">
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
                  <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: '11px' }} interval={trendPeriod <= 7 ? 0 : Math.floor(trendPeriod / 7)} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{label}</div>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
                              {p.name} : {p.value}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorTotal)" name="Total Reports" />
                  <Area type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} fill="url(#colorCritical)" name="Critical" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Disaster Distribution" className="chart-card chart-card-distribution">
            <div className="chart-fill chart-fill-distribution">
              {distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
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
                          {value} ({entry?.payload?.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 13 }}>
                  No disaster data
                </div>
              )}
            </div>
            <div className="total-reports">
              <div className="total-reports-value">{totalReports}</div>
              <div className="total-reports-label">Total Reports</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[16, 16]} className="dashboard-bottom">
        <Col xs={24} lg={24}>
          <Card
            title="Recent System Activity"
            extra={<Button type="link" size="small" onClick={() => navigate('/admin/disaster-reports')}>View All</Button>}
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
      </Row>
    </div>
  );
};

export default Dashboard;