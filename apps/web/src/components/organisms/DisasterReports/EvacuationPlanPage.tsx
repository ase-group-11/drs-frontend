import React, { useEffect, useState } from 'react';
import {
  Button, Spin, Tag, Typography, Progress, Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  HomeOutlined,
  CarOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import type { DisasterReport } from '../../../types';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImpactZone {
  zone_id: string;
  name: string;
  lat: number;
  lon: number;
  priority: number;
  population: number;
  vulnerable_count: number;
  distance_from_disaster_km: number;
}

interface Shelter {
  shelter_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  available: number;
  current_occupancy: number;
}

interface TransportSchedule {
  zone_id: string;
  zone_name: string;
  shelter_id: string;
  shelter_name: string;
  route_id: string;
  buses_needed: number;
  ambulances_needed: number;
  estimated_time_min: number;
}

interface CompletionMetric {
  status: string;
  evacuated: number;
  remaining: number;
  percentage: number;
}

interface EvacuationPlan {
  id: string;
  plan_ref: string;
  disaster_id: string;
  plan_status: string;
  impact_zones: ImpactZone[];
  population_stats: {
    total: number;
    children: number;
    vulnerable: number;
    zones_count: number;
  };
  shelters_with_capacity: Shelter[];
  transport_plan: {
    schedules: TransportSchedule[];
    total_buses: number;
    total_people: number;
    total_ambulances: number;
    total_vulnerable: number;
  };
  allocations: {
    buses_allocated: number;
    ambulances_allocated: number;
    allocation_confirmed: boolean;
    allocated_at: string;
  };
  completion_metrics: Record<string, CompletionMetric>;
  auto_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  activated_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  report: DisasterReport;
  planId: string;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString();

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  ACTIVE:    { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', icon: <SyncOutlined spin /> },
  PENDING:   { color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: <ClockCircleOutlined /> },
  COMPLETED: { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', icon: <CheckCircleOutlined /> },
  APPROVED:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <CheckCircleOutlined /> },
};

const PRIORITY_CFG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1 Critical', color: '#dc2626', bg: '#fef2f2' },
  2: { label: 'P2 High',     color: '#d97706', bg: '#fffbeb' },
  3: { label: 'P3 Standard', color: '#2563eb', bg: '#eff6ff' },
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <span style={{ fontSize: 16, color: '#7c3aed' }}>{icon}</span>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color = '#7c3aed' }) => (
  <div style={{
    background: '#fff', borderRadius: 10, padding: '14px 16px',
    borderLeft: `4px solid ${color}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flex: '1 1 140px', minWidth: 0,
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>{fmt(Number(value))}</div>
    {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EvacuationPlanPage: React.FC<Props> = ({ report, planId, onBack }) => {
  const [plan, setPlan] = useState<EvacuationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setLoading(true);
    apiClient.get<EvacuationPlan>(API_ENDPOINTS.EVACUATIONS.BY_ID(planId))
      .then(res => setPlan(res.data))
      .catch(() => setError('Failed to load evacuation plan details.'))
      .finally(() => setLoading(false));
  }, [planId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ padding: '32px 0' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 20 }}>Back</Button>
        <Empty description={error || 'Plan not found'} />
      </div>
    );
  }

  const statusCfg = STATUS_CFG[plan.plan_status] ?? STATUS_CFG.PENDING;

  // Total evacuated across all zones
  const totalEvacuated = Object.values(plan.completion_metrics).reduce((s, m) => s + m.evacuated, 0);
  const overallPct = plan.population_stats.total > 0
    ? Math.round((totalEvacuated / plan.population_stats.total) * 100)
    : 0;

  const section: React.CSSProperties = {
    background: '#fff', borderRadius: 12, padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16,
  };

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Back + Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={onBack}
            style={{ color: '#6b7280', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
          />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
              Evacuation Plan
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{plan.plan_ref}</Text>
              <Tag style={{
                fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 20,
                color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {statusCfg.icon} {plan.plan_status}
              </Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {report.title} — {report.location}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overall Progress ── */}
      <div style={{ ...section, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Overall Evacuation Progress</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{overallPct}%</Text>
        </div>
        <Progress
          percent={overallPct}
          strokeColor={{ '0%': '#7c3aed', '100%': '#4f46e5' }}
          trailColor="#f3f4f6"
          strokeWidth={10}
          showInfo={false}
        />
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Evacuated: <strong style={{ color: '#7c3aed' }}>{fmt(totalEvacuated)}</strong>
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Remaining: <strong style={{ color: '#ef4444' }}>{fmt(plan.population_stats.total - totalEvacuated)}</strong>
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Total: <strong>{fmt(plan.population_stats.total)}</strong>
          </Text>
        </div>
      </div>

      {/* ── Population Stats ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Total Population" value={plan.population_stats.total}    color="#7c3aed" />
        <StatCard label="Vulnerable"        value={plan.population_stats.vulnerable} sub="requiring assistance" color="#dc2626" />
        <StatCard label="Children"          value={plan.population_stats.children}  color="#d97706" />
        <StatCard label="Impact Zones"      value={plan.population_stats.zones_count} color="#0891b2" />
        <StatCard label="Buses Allocated"   value={plan.allocations.buses_allocated} color="#059669" />
        <StatCard label="Ambulances"        value={plan.allocations.ambulances_allocated} color="#7c3aed" />
      </div>

      {/* ── Impact Zones ── */}
      <div style={section}>
        <SectionTitle icon={<AlertOutlined />} title="Impact Zones" sub="Ordered by evacuation priority" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.impact_zones.map((zone) => {
            const pri = PRIORITY_CFG[zone.priority] ?? PRIORITY_CFG[3];
            const metric = plan.completion_metrics[zone.zone_id];
            const pct = metric?.percentage ?? 0;
            return (
              <div key={zone.zone_id} style={{
                background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      color: pri.color, background: pri.bg, border: `1px solid ${pri.color}30`,
                      whiteSpace: 'nowrap',
                    }}>{pri.label}</span>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{zone.name}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      👥 <strong>{fmt(zone.population)}</strong> residents
                    </Text>
                    <Text style={{ fontSize: 12, color: '#dc2626' }}>
                      ⚠️ <strong>{fmt(zone.vulnerable_count)}</strong> vulnerable
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                      📍 {zone.distance_from_disaster_km.toFixed(2)} km from incident
                    </Text>
                  </div>
                </div>
                {metric && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        Evacuated {fmt(metric.evacuated)} / {fmt(metric.evacuated + metric.remaining)}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: pct >= 100 ? '#16a34a' : '#7c3aed' }}>{pct}%</Text>
                    </div>
                    <Progress
                      percent={pct}
                      strokeColor={pct >= 100 ? '#16a34a' : '#7c3aed'}
                      trailColor="#e5e7eb"
                      strokeWidth={6}
                      showInfo={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Shelters ── */}
      <div style={section}>
        <SectionTitle icon={<HomeOutlined />} title="Evacuation Shelters" sub="Available capacity at each shelter" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {plan.shelters_with_capacity.map((shelter) => {
            const usedPct = Math.round((shelter.current_occupancy / shelter.capacity) * 100);
            const availPct = 100 - usedPct;
            return (
              <div key={shelter.shelter_id} style={{
                background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #e5e7eb',
              }}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 6 }}>
                  🏟️ {shelter.name}
                </Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Available: <strong style={{ color: '#16a34a' }}>{fmt(shelter.available)}</strong>
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Capacity: <strong>{fmt(shelter.capacity)}</strong>
                  </Text>
                </div>
                <Progress
                  percent={availPct}
                  strokeColor="#16a34a"
                  trailColor="#fee2e2"
                  strokeWidth={6}
                  showInfo={false}
                />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                  {availPct}% space available
                  {shelter.current_occupancy > 0 && ` · ${fmt(shelter.current_occupancy)} currently sheltering`}
                </Text>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Transport Plan ── */}
      <div style={section}>
        <SectionTitle
          icon={<CarOutlined />}
          title="Transport Schedules"
          sub={`${fmt(plan.transport_plan.total_buses)} buses · ${fmt(plan.transport_plan.total_ambulances)} ambulances`}
        />

        {/* Totals row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { label: 'Total Buses',       value: plan.transport_plan.total_buses,       color: '#059669' },
            { label: 'Total Ambulances',  value: plan.transport_plan.total_ambulances,  color: '#dc2626' },
            { label: 'People to Evacuate',value: plan.transport_plan.total_people,      color: '#2563eb' },
            { label: 'Vulnerable People', value: plan.transport_plan.total_vulnerable,  color: '#d97706' },
          ].map((s) => (
            <div key={s.label} style={{
              flex: '1 1 130px', background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #e5e7eb',
            }}>
              <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>{s.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{fmt(s.value)}</Text>
            </div>
          ))}
        </div>

        {/* Per-zone table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Zone', 'Shelter', 'Buses', 'Ambulances', 'ETA'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.transport_plan.schedules.map((s, i) => (
                <tr key={s.zone_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>
                    {s.zone_name}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                    {s.shelter_name}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{fmt(s.buses_needed)}</span>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(s.ambulances_needed)}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#374151', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                    {s.estimated_time_min} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Plan Metadata ── */}
      <div style={section}>
        <SectionTitle icon={<TeamOutlined />} title="Plan Details" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {[
            { label: 'Plan Reference',        value: plan.plan_ref },
            { label: 'Status',                value: plan.plan_status },
            { label: 'Auto Approved',         value: plan.auto_approved ? 'Yes' : 'No' },
            { label: 'Allocation Confirmed',  value: plan.allocations.allocation_confirmed ? 'Yes' : 'No' },
            { label: 'Approved By',           value: plan.approved_by ?? 'System (auto)' },
            { label: 'Activated At',          value: fmtDate(plan.activated_at) },
            { label: 'Allocated At',          value: fmtDate(plan.allocations.allocated_at) },
            { label: 'Completed At',          value: fmtDate(plan.completed_at) },
            { label: 'Created At',            value: fmtDate(plan.created_at) },
            { label: 'Last Updated',          value: fmtDate(plan.updated_at) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 2 }}>{label}</Text>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{value}</Text>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default EvacuationPlanPage;