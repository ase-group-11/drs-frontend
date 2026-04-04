import React, { useEffect, useRef, useState } from 'react';
import { Button, Spin, Tag, Typography, Progress, Empty } from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined, TeamOutlined,
  HomeOutlined, CarOutlined, AlertOutlined,
  CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, WarningOutlined,
} from '@ant-design/icons';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import apiClient from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../config';
import { useAuth } from '../../../context';
import { SectionTitle } from '../../atoms';
import { StatCard } from '../../molecules';
import type { DisasterReport } from '../../../types';

const { Text } = Typography;

// Set token at module level — same pattern as MapView.tsx
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvacRoute {
  route_id: string;
  score: number;
  fallback: boolean;
  origin_lat: number;
  origin_lon: number;
  origin_label: string;
  shelter_name: string;
  shelter_capacity: number;
  destination_shelter_id: string;
  distance_km: number;
  estimated_time_min: number;
  travel_time_seconds: number;
  traffic_delay_seconds: number;
  length_meters: number;
  points: [number, number][];
  geojson?: any;
  waypoints: any[];
}

interface ImpactZone {
  severity: string;
  area_name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  population: number;
  vulnerable_count: number;
  affected_roads: any[];
  affected_facilities: any[];
  disaster_id: string;
  zone_id?: string;
  name?: string;
}

interface Shelter {
  shelter_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  _dist_km?: number;
  available?: number;
  current_occupancy?: number;
}

interface TransportSchedule {
  route_id: string;
  shelter_id: string;
  shelter_name: string;
  ambulances_needed: number;
  rescue_units_needed: number;
  estimated_time_min: number;
  zone_id?: string;
  zone_name?: string;
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
    vulnerable?: number;
    mobile?: number;
    density_factor?: number;
  };
  shelters_with_capacity: Shelter[];
  best_routes_per_zone: Record<string, EvacRoute[]>;
  blocked_roads: any[];
  traffic_snapshot: { source: string; available: boolean; segments: any[] };
  transport_plan: {
    schedules: TransportSchedule[];
    total_people: number;
    total_ambulances: number;
    total_vulnerable: number;
    rescue_units_needed: number;
    ambulances_available: number;
    rescue_units_available: number;
    unit_summary?: {
      rescue?: { available: number; transport_capacity: number };
      ambulance?: { available: number; transport_capacity: number };
    };
  };
  allocations: {
    ambulances_allocated: number;
    rescue_units_allocated: number;
    allocation_confirmed: boolean;
    allocated_at: string;
  };
  completion_metrics: Record<string, CompletionMetric>;
  auto_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  activated_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  report: DisasterReport;
  planId: string;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtMins = (mins: number) => {
  const h = Math.floor(mins / 60); const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};
const fmtMeters = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;

const SEV_COLOR: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
const ROUTE_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  ACTIVE:    { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', icon: <SyncOutlined spin /> },
  PENDING:   { color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: <ClockCircleOutlined /> },
  COMPLETED: { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', icon: <CheckCircleOutlined /> },
  APPROVED:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <CheckCircleOutlined /> },
};

// ─── Evacuation Routes Map ─────────────────────────────────────────────────────

const STYLE_URLS: Record<string, string> = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  streets:   'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

const EvacuationMap: React.FC<{ plan: EvacuationPlan }> = ({ plan }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [styleMode, setStyleMode] = useState<'dark' | 'streets' | 'satellite'>('dark');
  const [is3D, setIs3D] = useState(false);
  const [ctrlOpen, setCtrlOpen] = useState(false);

  const allRoutes = Object.values(plan.best_routes_per_zone ?? {}).flat();

  // Build shelter → color map
  const shelterColorMap: Record<string, string> = {};
  let colorIdx = 0;
  allRoutes.forEach(r => {
    if (!shelterColorMap[r.shelter_name]) shelterColorMap[r.shelter_name] = ROUTE_COLORS[colorIdx++ % ROUTE_COLORS.length];
  });
  const legendEntries = Object.entries(shelterColorMap).map(([name, color]) => ({ name, color }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    const container = containerRef.current;

    const initMap = () => {
      if (mapRef.current) return; // already initialized
      if (container.offsetWidth === 0 || container.offsetHeight === 0) return;

      const centerLon = plan.impact_zones[0]?.center_lon ?? -6.26;
      const centerLat = plan.impact_zones[0]?.center_lat ?? 53.34;
    const m = new mapboxgl.Map({ container: container, style: 'mapbox://styles/mapbox/dark-v11', center: [centerLon, centerLat], zoom: 11 });
    mapRef.current = m;
    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    m.on('load', () => {
      // Draw routes
      allRoutes.forEach((route, idx) => {
        const color = shelterColorMap[route.shelter_name] ?? ROUTE_COLORS[idx % ROUTE_COLORS.length];

        // Find this route's shelter to get its actual coordinates
        const shelter = plan.shelters_with_capacity.find(s => s.shelter_id === route.destination_shelter_id);

        // Check if geojson/points are valid and start near the route origin (within ~0.1 degrees)
        const isNearOrigin = (lon: number, lat: number) =>
          Math.abs(lat - route.origin_lat) < 0.1 && Math.abs(lon - route.origin_lon) < 0.1;

        let coords: [number, number][] | null = null;

        // Try geojson first
        if (route.geojson?.geometry?.coordinates?.length > 1) {
          const first = route.geojson.geometry.coordinates[0] as [number, number];
          if (isNearOrigin(first[0], first[1])) {
            coords = route.geojson.geometry.coordinates as [number, number][];
          }
        }

        // Try points
        if (!coords && route.points?.length > 1) {
          // points are [lat, lon] pairs
          const first = route.points[0];
          if (isNearOrigin(first[1], first[0])) {
            coords = route.points.map(([lat, lon]) => [lon, lat] as [number, number]);
          }
        }

        // Fallback: draw straight line from origin to shelter
        if (!coords && shelter) {
          coords = [
            [route.origin_lon, route.origin_lat],
            [shelter.lon, shelter.lat],
          ];
        } else if (!coords) {
          return; // can't draw without shelter coords
        }

        const sid = `route-${route.route_id}`;
        const lid = `line-${route.route_id}`;
        m.addSource(sid, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
        m.addLayer({
          id: lid, type: 'line', source: sid,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': color, 'line-width': 3, 'line-opacity': 0.85,
            'line-dasharray': (coords.length <= 2) ? [2, 2] : [1], // dashed if straight line fallback
          },
        });
      });

      // Impact zone markers (red)
      plan.impact_zones.forEach(zone => {
        const el = document.createElement('div');
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 0 3px rgba(239,68,68,0.3);cursor:pointer;';
        new mapboxgl.Marker({ element: el }).setLngLat([zone.center_lon, zone.center_lat])
          .setPopup(new mapboxgl.Popup({ offset: 14, maxWidth: '220px' }).setHTML(`
            <div style="font-family:-apple-system,sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:13px;color:#dc2626;margin-bottom:6px">⚠ ${zone.area_name}</div>
              <div style="display:flex;flex-direction:column;gap:3px">
                <div style="font-size:12px;color:#374151">Severity: <strong>${zone.severity}</strong></div>
                <div style="font-size:12px;color:#374151">Radius: <strong>${zone.radius_km} km</strong></div>
                <div style="font-size:12px;color:#374151">👥 <strong>${zone.population}</strong> residents</div>
                <div style="font-size:12px;color:#dc2626">⚠️ <strong>${zone.vulnerable_count}</strong> vulnerable</div>
              </div>
            </div>`)).addTo(m);
      });

      // Shelter markers (blue)
      plan.shelters_with_capacity.forEach(shelter => {
        // Find the route to this shelter to get the actual route distance
        const route = allRoutes.find(r => r.destination_shelter_id === shelter.shelter_id);
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;border-radius:8px;background:#1d4ed8;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
        el.textContent = '🏟';
        new mapboxgl.Marker({ element: el }).setLngLat([shelter.lon, shelter.lat])
          .setPopup(new mapboxgl.Popup({ offset: 18, maxWidth: '220px' }).setHTML(`
            <div style="font-family:-apple-system,sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:13px;color:#1d4ed8;margin-bottom:6px">${shelter.name}</div>
              <div style="display:flex;flex-direction:column;gap:3px">
                <div style="font-size:12px;color:#374151">Capacity: <strong>${shelter.capacity.toLocaleString()}</strong></div>
                ${route ? `<div style="font-size:12px;color:#374151">Distance: <strong>${route.distance_km} km</strong></div>` : ''}
                ${route ? `<div style="font-size:12px;color:#374151">ETA: <strong>${route.estimated_time_min} min</strong></div>` : ''}
              </div>
            </div>`)).addTo(m);
      });

      // Fit bounds
      const pts: [number, number][] = [
        ...plan.impact_zones.map(z => [z.center_lon, z.center_lat] as [number, number]),
        ...plan.shelters_with_capacity.map(s => [s.lon, s.lat] as [number, number]),
      ];
      if (pts.length > 1) {
        const bounds = pts.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(pts[0], pts[0]));
        m.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    });
    }; // end initMap

    // Try immediately, then use ResizeObserver as fallback
    initMap();

    const ro = new ResizeObserver(() => { initMap(); });
    ro.observe(container);

    const timer = setTimeout(initMap, 100);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style switcher
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setStyle(STYLE_URLS[styleMode]);
  }, [styleMode]);

  // 3D toggle
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (is3D) {
      m.easeTo({ pitch: 45, bearing: -10, duration: 600 });
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }, [is3D]);

  const styleMeta = [
    { mode: 'streets', icon: '☀️', label: 'Light' },
    { mode: 'dark',    icon: '🌙', label: 'Dark' },
    { mode: 'satellite', icon: '🛰️', label: 'Satellite' },
  ] as const;

  const curStyle = styleMeta.find(s => s.mode === styleMode)!;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid white', boxShadow: '0 0 0 2px rgba(239,68,68,0.3)' }} />
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Evacuation Zone</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#1d4ed8' }} />
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Shelter</Text>
        </div>
        {legendEntries.map(e => (
          <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 24, height: 3, background: e.color, borderRadius: 2 }} />
            <Text style={{ fontSize: 11, color: '#6b7280' }}>→ {e.name}</Text>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div ref={containerRef} style={{ width: '100%', height: 440 }} />

        {/* Style Controls Overlay */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <button
            onClick={() => setCtrlOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(12px)',
              border: `1px solid ${ctrlOpen ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.2)'}`,
              color: '#f1f5f9', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              boxShadow: ctrlOpen ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            <span>{curStyle.icon}</span>
            <span>{curStyle.label}</span>
            {is3D && <span style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 800 }}>3D</span>}
            <span style={{ color: 'rgba(34,211,238,0.6)', fontSize: 10 }}>{ctrlOpen ? '▲' : '▼'}</span>
          </button>

          {ctrlOpen && (
            <div style={{
              marginTop: 6, background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(34,211,238,0.15)', borderRadius: 12,
              padding: '8px', minWidth: 170, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(34,211,238,0.5)', letterSpacing: '0.1em', padding: '4px 8px 6px' }}>MAP STYLE</div>
              {styleMeta.map(({ mode, icon, label }) => {
                const active = styleMode === mode;
                return (
                  <button key={mode} onClick={() => { setStyleMode(mode); setCtrlOpen(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(34,211,238,0.12)' : 'transparent',
                    color: active ? '#22d3ee' : '#cbd5e1', fontSize: 13, fontWeight: active ? 700 : 400,
                  }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                    {active && <span style={{ color: '#22d3ee', fontSize: 12 }}>✓</span>}
                  </button>
                );
              })}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(34,211,238,0.5)', letterSpacing: '0.1em', padding: '4px 8px 6px' }}>VIEW</div>
              <button onClick={() => { setIs3D(v => !v); setCtrlOpen(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: is3D ? 'rgba(34,211,238,0.12)' : 'transparent', color: is3D ? '#22d3ee' : '#cbd5e1', fontSize: 13,
              }}>
                <span style={{ fontSize: 16 }}>🏙️</span>
                <span style={{ flex: 1, textAlign: 'left' }}>3D Buildings</span>
                {is3D && <span style={{ color: '#22d3ee', fontSize: 12 }}>✓</span>}
              </button>
              <button onClick={() => {
                mapRef.current?.flyTo({ center: [plan.impact_zones[0]?.center_lon ?? -6.26, plan.impact_zones[0]?.center_lat ?? 53.34], zoom: 11, pitch: 0, bearing: 0, duration: 1000 });
                setCtrlOpen(false);
              }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: 'transparent', color: '#cbd5e1', fontSize: 13,
              }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <span>Reset View</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, display: 'block' }}>
        Click routes or markers for details · Red = evacuation zones · Blue = shelters
      </Text>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const EvacuationPlanPage: React.FC<Props> = ({ report, planId, onBack }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<EvacuationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlan = () => {
    apiClient.get<EvacuationPlan>(API_ENDPOINTS.EVACUATIONS.BY_ID(planId))
      .then(res => setPlan(res.data))
      .catch(() => setError('Failed to load evacuation plan details.'))
      .finally(() => setLoading(false));
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.EVACUATIONS.APPROVE(planId), {
        approved_by: user?.fullName ?? 'Admin',
        notes: 'Approved via DRS dashboard.',
      });
      fetchPlan();
    } catch {
      // error silently — could add notification here
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.EVACUATIONS.ACTIVATE(planId));
      fetchPlan();
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setLoading(true);
    fetchPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><Spin size="large" /></div>;
  if (error || !plan) return (
    <div style={{ padding: '32px 0' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginBottom: 20 }}>Back</Button>
      <Empty description={error || 'Plan not found'} />
    </div>
  );

  const statusCfg = STATUS_CFG[plan.plan_status] ?? STATUS_CFG.PENDING;
  const totalEvacuated = Object.values(plan.completion_metrics ?? {}).reduce((s, m) => s + (m.evacuated ?? 0), 0);
  const overallPct = plan.population_stats.total > 0 ? Math.round((totalEvacuated / plan.population_stats.total) * 100) : 0;
  const allRoutes = Object.values(plan.best_routes_per_zone ?? {}).flat();

  const section: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 };

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}
              style={{ color: '#6b7280', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7c3aed')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
            />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Evacuation Plan</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{plan.plan_ref}</Text>
                <Tag style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 20, color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {statusCfg.icon} {plan.plan_status}
                </Tag>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />{report.title} — {report.location}
                </Text>
              </div>
            </div>
          </div>

          {/* Action button — only for PENDING and APPROVED */}
          {plan.plan_status === 'PENDING' && (
            <Button
              type="primary"
              loading={actionLoading}
              onClick={handleApprove}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600, flexShrink: 0 }}
            >
              ✓ Approve Plan
            </Button>
          )}
          {plan.plan_status === 'APPROVED' && (
            <Button
              type="primary"
              loading={actionLoading}
              onClick={handleActivate}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, flexShrink: 0 }}
            >
              ▶ Activate Plan
            </Button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div style={{ ...section, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Overall Evacuation Progress</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{overallPct}%</Text>
        </div>
        <Progress percent={overallPct} strokeColor={{ '0%': '#7c3aed', '100%': '#4f46e5' }} trailColor="#f3f4f6" strokeWidth={10} showInfo={false} />
        <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Evacuated: <strong style={{ color: '#7c3aed' }}>{fmt(totalEvacuated)}</strong></Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Remaining: <strong style={{ color: '#ef4444' }}>{fmt(plan.population_stats.total - totalEvacuated)}</strong></Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Total: <strong>{fmt(plan.population_stats.total)}</strong></Text>
        </div>
      </div>

      {/* Population Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Total Population"  value={plan.population_stats?.total ?? 0}       color="#7c3aed" />
        <StatCard label="Vulnerable"         value={plan.population_stats?.vulnerable ?? 0}  sub="requiring assistance" color="#dc2626" />
        <StatCard label="Mobile"             value={plan.population_stats?.mobile ?? 0}      color="#d97706" />
        <StatCard label="Impact Zones"       value={plan.impact_zones?.length ?? 0}          color="#0891b2" />
        <StatCard label="Ambulances Alloc."  value={plan.allocations?.ambulances_allocated ?? 0} color="#7c3aed" />
        <StatCard label="Rescue Units"       value={plan.allocations?.rescue_units_allocated ?? 0} color="#059669" />
      </div>

      {/* Evacuation Routes Map */}
      {allRoutes.length > 0 && (
        <div style={section}>
          <SectionTitle icon={<CarOutlined />} title="Evacuation Routes Map"
            sub={`${allRoutes.length} route${allRoutes.length !== 1 ? 's' : ''} planned from impact zones to shelters`} />
          <EvacuationMap plan={plan} />
        </div>
      )}

      {/* Route Details */}
      {allRoutes.length > 0 && (
        <div style={section}>
          <SectionTitle icon={<CarOutlined />} title="Route Details" sub="Best evacuation routes per zone to each shelter" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(plan.best_routes_per_zone).map(([, routes]) =>
              routes.map((route, i) => (
                <div key={route.route_id} style={{
                  background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid #e5e7eb', borderLeft: `4px solid ${ROUTE_COLORS[i % ROUTE_COLORS.length]}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div>
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {route.origin_label} → {route.shelter_name}
                      </Text>
                      {route.fallback && <Tag style={{ marginLeft: 8, fontSize: 10, color: '#9ca3af', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Fallback</Tag>}
                    </div>
                    <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>Score: {route.score}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>📏 <strong>{route.distance_km} km</strong> ({fmtMeters(route.length_meters)})</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>⏱ <strong>{fmtMins(route.estimated_time_min)}</strong> ETA</Text>
                    {route.traffic_delay_seconds > 0 && (
                      <Text style={{ fontSize: 12, color: '#f97316' }}>🚦 +{fmtMins(route.traffic_delay_seconds / 60)} traffic delay</Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>🏟 Shelter capacity: <strong>{route.shelter_capacity.toLocaleString()}</strong></Text>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Impact Zones */}
      <div style={section}>
        <SectionTitle icon={<AlertOutlined />} title="Impact Zones" sub="Zones requiring evacuation" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.impact_zones.map((zone, idx) => {
            const zoneKey = zone.zone_id ?? zone.area_name ?? String(idx);
            const metric = plan.completion_metrics[zoneKey];
            const pct = metric?.percentage ?? 0;
            const sevColor = SEV_COLOR[zone.severity] ?? '#6b7280';
            return (
              <div key={zoneKey} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb', borderLeft: `4px solid ${sevColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag style={{ fontSize: 10, color: sevColor, background: sevColor + '15', border: `1px solid ${sevColor}30`, borderRadius: 20, margin: 0 }}>{zone.severity}</Tag>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{zone.name ?? zone.area_name}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>👥 <strong>{fmt(zone.population)}</strong> residents</Text>
                    <Text style={{ fontSize: 12, color: '#dc2626' }}>⚠️ <strong>{fmt(zone.vulnerable_count)}</strong> vulnerable</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>📍 {zone.radius_km.toFixed(1)} km radius</Text>
                  </div>
                </div>
                {zone.affected_roads?.length > 0 && (
                  <Text style={{ fontSize: 11, color: '#ef4444', display: 'block', marginBottom: 4 }}>
                    🚧 Affected roads: {zone.affected_roads.map((r: any) => r.road_name ?? r).join(', ')}
                  </Text>
                )}
                {zone.affected_facilities?.length > 0 && (
                  <Text style={{ fontSize: 11, color: '#d97706', display: 'block', marginBottom: 4 }}>
                    🏥 Affected facilities: {zone.affected_facilities.map((f: any) => f.name ?? f).join(', ')}
                  </Text>
                )}
                {metric && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>Evacuated {fmt(metric.evacuated)} / {fmt(metric.evacuated + metric.remaining)}</Text>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: pct >= 100 ? '#16a34a' : '#7c3aed' }}>{pct}%</Text>
                    </div>
                    <Progress percent={pct} strokeColor={pct >= 100 ? '#16a34a' : '#7c3aed'} trailColor="#e5e7eb" strokeWidth={6} showInfo={false} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Roads */}
      {plan.blocked_roads?.length > 0 && (
        <div style={section}>
          <SectionTitle icon={<WarningOutlined />} title="Blocked Roads" sub="Roads unavailable for evacuation" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {plan.blocked_roads.map((road: any, i: number) => (
              <Tag key={i} style={{ fontSize: 12, padding: '4px 10px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                🚧 {road.road_name ?? road.name ?? road}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Shelters */}
      <div style={section}>
        <SectionTitle icon={<HomeOutlined />} title="Evacuation Shelters" sub="Available shelters and capacity" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {plan.shelters_with_capacity.map(shelter => {
            const occupancy = shelter.current_occupancy ?? 0;
            const available = shelter.available ?? shelter.capacity;
            const usedPct = Math.round((occupancy / shelter.capacity) * 100);
            const availPct = 100 - usedPct;
            return (
              <div key={shelter.shelter_id} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 6 }}>🏟️ {shelter.name}</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Available: <strong style={{ color: '#16a34a' }}>{fmt(available)}</strong></Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Capacity: <strong>{fmt(shelter.capacity)}</strong></Text>
                </div>
                {shelter._dist_km != null && <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>📍 {shelter._dist_km.toFixed(1)} km away</Text>}
                <Progress percent={availPct} strokeColor="#16a34a" trailColor="#fee2e2" strokeWidth={6} showInfo={false} />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                  {availPct}% space available{occupancy > 0 && ` · ${fmt(occupancy)} currently sheltering`}
                </Text>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transport Plan */}
      <div style={section}>
        <SectionTitle icon={<CarOutlined />} title="Transport Plan" sub={`${fmt(plan.transport_plan.total_ambulances)} ambulances · ${fmt(plan.transport_plan.total_people)} people`} />

        {/* Unit availability */}
        {plan.transport_plan.unit_summary && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {plan.transport_plan.unit_summary.ambulance && (
              <div style={{ flex: '1 1 180px', background: '#fef2f2', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
                <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>🚑 Ambulances</Text>
                <Text style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{plan.transport_plan.unit_summary.ambulance.available} available</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Capacity: {plan.transport_plan.unit_summary.ambulance.transport_capacity} people</Text>
              </div>
            )}
            {plan.transport_plan.unit_summary.rescue && (
              <div style={{ flex: '1 1 180px', background: '#fff7ed', borderRadius: 8, padding: '10px 12px', border: '1px solid #fed7aa' }}>
                <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>🚒 Rescue Units</Text>
                <Text style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{plan.transport_plan.unit_summary.rescue.available} available</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Capacity: {plan.transport_plan.unit_summary.rescue.transport_capacity} people</Text>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { label: 'Total Ambulances',    value: plan.transport_plan.total_ambulances,    color: '#dc2626' },
            { label: 'Rescue Units Needed', value: plan.transport_plan.rescue_units_needed, color: '#d97706' },
            { label: 'People to Evacuate',  value: plan.transport_plan.total_people,        color: '#2563eb' },
            { label: 'Vulnerable People',   value: plan.transport_plan.total_vulnerable,    color: '#9333ea' },
          ].map(s => (
            <div key={s.label} style={{ flex: '1 1 130px', background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
              <Text style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>{s.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{fmt(s.value ?? 0)}</Text>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Shelter', 'Ambulances', 'Rescue Units', 'ETA'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.transport_plan.schedules.map((s, i) => (
                <tr key={s.route_id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>{s.shelter_name ?? s.zone_name ?? '—'}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(s.ambulances_needed)}</span></td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#d97706', fontWeight: 600 }}>{fmt(s.rescue_units_needed ?? 0)}</span></td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{s.estimated_time_min} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traffic Info — only shown when live data is available */}
      {plan.traffic_snapshot?.available && (
      <div style={section}>
        <SectionTitle icon={<CarOutlined />} title="Traffic Information" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            🟢 Live traffic data used
          </Tag>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>Source: {plan.traffic_snapshot.source}</Text>
          {plan.traffic_snapshot.segments?.length > 0 && (
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{plan.traffic_snapshot.segments.length} segments monitored</Text>
          )}
        </div>
      </div>
      )}

      {/* Allocations */}
      <div style={section}>
        <SectionTitle icon={<TeamOutlined />} title="Resource Allocations" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Ambulances Allocated', value: String(plan.allocations.ambulances_allocated), color: '#dc2626' },
            { label: 'Rescue Units Allocated', value: String(plan.allocations.rescue_units_allocated), color: '#d97706' },
            { label: 'Allocation Confirmed', value: plan.allocations.allocation_confirmed ? 'Yes' : 'No', color: plan.allocations.allocation_confirmed ? '#16a34a' : '#6b7280' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 2 }}>{label}</Text>
              <Text style={{ fontSize: 15, fontWeight: 700, color }}>{value}</Text>
            </div>
          ))}
        </div>
        {plan.allocations.allocated_at && <Text style={{ fontSize: 12, color: '#9ca3af' }}>Allocated at: {fmtDate(plan.allocations.allocated_at)}</Text>}
      </div>

      {/* Plan Details */}
      <div style={section}>
        <SectionTitle icon={<TeamOutlined />} title="Plan Details" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {[
            { label: 'Plan Reference',   value: plan.plan_ref },
            { label: 'Status',           value: plan.plan_status },
            { label: 'Auto Approved',    value: plan.auto_approved ? 'Yes' : 'No' },
            { label: 'Approved By',      value: plan.approved_by ?? (plan.auto_approved ? 'System (auto)' : '—') },
            { label: 'Approved At',      value: fmtDate(plan.approved_at) },
            { label: 'Activated At',     value: fmtDate(plan.activated_at) },
            { label: 'Completed At',     value: fmtDate(plan.completed_at) },
            { label: 'Created At',       value: fmtDate(plan.created_at) },
            { label: 'Last Updated',     value: fmtDate(plan.updated_at) },
            ...(plan.notes ? [{ label: 'Notes', value: plan.notes }] : []),
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