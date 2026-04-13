import { API_ENDPOINTS } from '../../../config';
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, Tag, Spin, message } from 'antd';
import {
  UserOutlined, AlertOutlined, TeamOutlined, ThunderboltOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useLocation } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import { getSystemStatus } from '../../../services';
import { useNotifications } from '../../../context/NotificationContext';
import type { AppNotification } from '../../../hooks/useWebSocket';
import type { DashboardStats, DisasterRaw, DisastersApiResponse, HealthResponse } from '../../../types';
import SystemActivityPage from './SystemActivityPage';
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
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState(7);
  const [showActivity, setShowActivity] = useState(false);

  // KPI stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeDisasters, setActiveDisasters] = useState(0);
  const [criticalActiveDisasters, setCriticalActiveDisasters] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);
  const [activeTeams, setActiveTeams] = useState(0);

  // Chart data
  const [trendData, setTrendData] = useState<{ day: string; total: number; critical: number }[]>([]);
  const [distributionData, setDistributionData] = useState<{ name: string; value: number; color: string }[]>([]);

  const [allDisasters, setAllDisasters] = useState<DisasterRaw[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const location = useLocation();

  // Shared notifications from context — same instance as AdminTemplate + NotificationPanel
  const { notifications, connected, scrollToId, setScrollToId } = useNotifications();

  // On mount: if navigated here via notification click, read scrollToId from route state
  useEffect(() => {
    const navState = location.state as { scrollToId?: string } | null;
    if (navState?.scrollToId) {
      setScrollToId(navState.scrollToId);
      setShowActivity(true);
      // Clear state so back-navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When scrollToId is set from panel click while already on dashboard
  useEffect(() => {
    if (scrollToId) setShowActivity(true);
  }, [scrollToId]);

  useEffect(() => {
    fetchAll();
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHealth = async () => {
    const res = await getSystemStatus();
    if (res.success && res.data) setHealth(res.data);
  };

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
      const [disastersRes, unitsRes, usersRes] = await Promise.all([
        apiClient.get<DisastersApiResponse>(API_ENDPOINTS.ADMIN.DISASTERS_ALL),
        apiClient.get<{ units: { unit_status: string }[]; total_count: number; active_count: number }>(API_ENDPOINTS.TEAMS.LIST),
        apiClient.get<{ total_count: number; users: { created_at: string }[]; summary: { active: number } }>(API_ENDPOINTS.USER_MANAGEMENT.LIST + '?limit=200'),
      ]);

      // ── KPI: Total Users from /users/ ─────────────────────────────────────
      const totalUsersCount = usersRes.data?.total_count ?? 0;

      // Count users created this calendar month
      const now = new Date();
      const usersThisMonth = (usersRes.data?.users ?? []).filter((u) => {
        const d = new Date(u.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;

      setStats((prev) => prev
        ? { ...prev, totalUsers: totalUsersCount, totalUsersChange: usersThisMonth }
        : { totalUsers: totalUsersCount, totalUsersChange: usersThisMonth, systemStatus: 'operational', uptime: 99.9 } as any);

      // ── KPI: Active Disasters from /disasters/all ─────────────────────────
      const disasters: DisasterRaw[] = disastersRes.data?.disasters ?? [];
      setAllDisasters(disasters);

      // Prefer the server-side summary so the count is accurate even when the
      // backend paginates and only a subset of records is in `disasters`.
      // Fall back to local filtering only if the summary is absent.
      const serverSummary = disastersRes.data?.summary;
      const activeDisCount = serverSummary
        ? (serverSummary.active ?? 0) + (serverSummary.monitoring ?? 0)
        : disasters.filter(
            (d) => d.disaster_status === 'ACTIVE' || d.disaster_status === 'MONITORING'
          ).length;
      const criticalActive = serverSummary
        ? (serverSummary.critical ?? 0)
        : disasters.filter(
            (d) => (d.disaster_status === 'ACTIVE' || d.disaster_status === 'MONITORING')
                && d.severity === 'CRITICAL'
          ).length;
      setActiveDisasters(activeDisCount);
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

  const SEV_COLOR: Record<AppNotification['severity'], string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#22c55e',
  };
  const SEV_BG: Record<AppNotification['severity'], string> = {
    critical: '#fef2f2', high: '#fff7ed', medium: '#fefce8', low: '#eff6ff', info: '#f0fdf4',
  };

  function formatAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  const totalReports = distributionData.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return <div className="dashboard-loading"><Spin size="large" /></div>;
  }

  // ── Sub-page: full activity log ─────────────────────────────────────────────
  if (showActivity) {
    return (
      <div className="dashboard-container">
        <SystemActivityPage
          notifications={notifications}
          connected={connected}
          scrollToId={scrollToId}
          onBack={() => { setShowActivity(false); setScrollToId(null); }}
        />
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
          <Card className={`stat-card ${health && health.status !== 'ok' ? 'stat-card-red' : 'stat-card-green'}`}>
            <div className={`stat-icon-wrapper ${health && health.status !== 'ok' ? 'stat-icon-red' : 'stat-icon-green'}`}>
              <ThunderboltOutlined className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">System Status</div>
              <div className={`stat-value stat-status`} style={{ color: health && health.status !== 'ok' ? '#dc2626' : '#16a34a' }}>
                {health ? (health.status === 'ok' ? 'Operational' : 'Degraded') : 'Loading...'}
              </div>
              <div className="stat-detail">
                {health
                  ? `${Object.values(health.services).filter(s => s.status === 'ok' || s.status === 'healthy').length} / ${Object.values(health.services).length} services healthy`
                  : 'Checking services...'}
              </div>
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

      {/* Recent System Activity */}
      <Row gutter={[16, 16]} className="dashboard-bottom">
        <Col xs={24} lg={24}>
          <Card
            title="Recent System Activity"
          >
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
                No events yet. Listening for WebSocket events...
              </div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    {/* Severity dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: SEV_COLOR[n.severity], flexShrink: 0,
                    }} />

                    {/* Event info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.description}
                      </div>
                    </div>

                    {/* Severity tag */}
                    <Tag style={{
                      fontSize: 10, padding: '1px 8px', borderRadius: 10, margin: 0, flexShrink: 0,
                      color: SEV_COLOR[n.severity], background: SEV_BG[n.severity],
                      border: `1px solid ${SEV_COLOR[n.severity]}33`,
                    }}>
                      {n.severity.charAt(0).toUpperCase() + n.severity.slice(1)}
                    </Tag>

                    {/* Time */}
                    <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
                      {formatAgo(n.timestamp)}
                    </span>
                  </div>
                ))}

                {notifications.length > 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 12 }}>
                    <Button type="link" size="small" onClick={() => { setScrollToId(null); setShowActivity(true); }}>
                      View all {notifications.length} event{notifications.length !== 1 ? 's' : ''} →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;