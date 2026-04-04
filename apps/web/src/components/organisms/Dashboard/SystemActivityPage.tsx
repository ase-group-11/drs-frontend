import React, { useEffect, useState } from 'react';
import { Button, Empty, Tag } from 'antd';
import { ArrowLeftOutlined, WifiOutlined } from '@ant-design/icons';
import mapboxgl from 'mapbox-gl';
import type { AppNotification } from '../../../hooks/useWebSocket';
import { SEVERITY_CONFIG as SEV } from '../../atoms';

// ─── Time formatting ──────────────────────────────────────────────────────────

function formatFull(date: Date): string {
  return date.toLocaleString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Extract all displayable fields from raw WS payload ──────────────────────

interface DataField { label: string; value: string }

// Format seconds as "X min Y sec"
function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? (sec > 0 ? `${m}m ${sec}s` : `${m}m`) : `${sec}s`;
}

// Format meters as "X.X km" or "X m"
function fmtMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// ─── Mapbox reverse geocoding ─────────────────────────────────────────────────

const geocodeCache: Record<string, string> = {};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const token = mapboxgl.accessToken || process.env.REACT_APP_MAPBOX_TOKEN;
    if (!token) return `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`
    );
    const json = await res.json();
    const place = json.features?.[0]?.place_name;
    if (!place) return `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    // Take just street + neighbourhood (first 2 comma parts)
    const short = place.split(',').slice(0, 2).join(',').trim();
    geocodeCache[key] = short;
    return short;
  } catch (err) {
    console.error('[Geocode] Failed:', err);
    return `(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

// ─── Vehicles display with geocoded locations ────────────────────────────────

interface VehicleEntry {
  user_id: string;
  type: string;
  current_location: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

const VehiclesField: React.FC<{ vehicles: VehicleEntry[] }> = ({ vehicles }) => {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      vehicles.map(async (v, i) => {
        const [from, to] = await Promise.all([
          reverseGeocode(v.current_location.lat, v.current_location.lng),
          reverseGeocode(v.destination.lat, v.destination.lng),
        ]);
        return `#${i + 1}: ${v.type ?? 'general'} — ${from} → ${to}`;
      })
    ).then((resolved) => {
      if (!cancelled) setLines(resolved);
    });
    return () => { cancelled = true; };
  }, [vehicles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        Vehicles
      </span>
      {lines === null ? (
        <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Resolving locations...</span>
      ) : lines.map((line, i) => (
        <span key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{line}</span>
      ))}
    </div>
  );
};
function parseComplexField(key: string, value: any): string | null {
  if (typeof value !== 'object' || value === null) return null;

  // vehicles handled separately by VehiclesField component
  if (key === 'vehicles' && Array.isArray(value)) return null;

  // route_assignments: {userId: routeId} — just show count
  if (key === 'route_assignments' && !Array.isArray(value)) {
    const entries = Object.entries(value);
    return `${entries.length} vehicle${entries.length !== 1 ? 's' : ''} assigned to routes`;
  }

  // routes / chosen_routes: array of route objects
  if ((key === 'routes' || key === 'chosen_routes') && Array.isArray(value)) {
    return value.map((r: any, i: number) => {
      const parts = [`Route ${i + 1}`];
      if (r.travel_time_seconds) parts.push(`${fmtSecs(r.travel_time_seconds)} travel`);
      if (r.length_meters)       parts.push(fmtMeters(r.length_meters));
      if (r.traffic_delay_seconds > 0) parts.push(`+${fmtSecs(r.traffic_delay_seconds)} delay`);
      return parts.join(' · ');
    }).join('\n');
  }

  // affected_roads / blocked_roads: array of {road_name, ...}
  if ((key === 'affected_roads' || key === 'blocked_roads') && Array.isArray(value)) {
    return value.map((r: any) => r.road_name ?? r.name ?? JSON.stringify(r)).join(', ');
  }

  // recommended_services: array of strings
  if (key === 'recommended_services' && Array.isArray(value)) {
    return value.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(', ');
  }

  // unit_ids / unit_codes: array of strings
  if ((key === 'unit_ids' || key === 'unit_codes') && Array.isArray(value)) {
    return value.join(', ');
  }

  return null;
}

function extractDataFields(raw: AppNotification['raw']): DataField[] {
  const fields: DataField[] = [];

  const add = (label: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str === '{}' || str === '[]') return;
    fields.push({ label, value: str });
  };

  // Top-level WS fields — skip those already shown in the card header
  add('Service',    raw.service);
  add('Event Type', raw.event_type);
  add('Severity',   raw.severity);

  // Nested data object
  // 'vehicles' is rendered by VehiclesField component separately
  const SKIP_DATA_KEYS = new Set(['details', 'vehicles']);
  const LABELS: Record<string, string> = {
    disaster_id:          'Disaster ID',
    tracking_id:          'Tracking ID',
    resolution_notes:     'Resolution Notes',
    resolved_time:        'Resolved Time',
    dispatched_at:        'Dispatched At',
    units_dispatched:     'Units Dispatched',
    unit_ids:             'Unit Codes',
    unit_codes:           'Unit Codes',
    vehicles_affected:    'Vehicles Count',
    vehicles_count:       'Vehicles Count',
    vehicles:             'Vehicles',
    route_assignments:    'Route Assignments',
    routes:               'Routes',
    chosen_routes:        'Routes',
    overflow_count:       'Overflow Count',
    plan_id:              'Plan ID',
    impact_radius_km:     'Impact Radius (km)',
    affected_roads:       'Affected Roads',
    blocked_roads:        'Blocked Roads',
    recommended_services: 'Recommended Services',
    new_severity:         'New Severity',
    severity:             'Severity',
    reason:               'Reason',
    disaster_type:        'Disaster Type',
    location:             'Location',
    backup_type:          'Backup Type',
    requested_by:         'Requested By',
    priority_level:       'Priority Level',
    trigger_reroute:      'Trigger Reroute',
    trigger_deploy:       'Trigger Deploy',
    confidence:           'Confidence',
    cleared_roads:        'Cleared Roads',
    cleared_at:           'Cleared At',
    update_type:          'Update Type',
    cleared_segments:     'Cleared Segments',
    routes_recalculated:  'Routes Recalculated',
  };

  if (raw.data && typeof raw.data === 'object') {
    Object.entries(raw.data).forEach(([k, v]) => {
      if (SKIP_DATA_KEYS.has(k)) return;
      if (v === undefined || v === null || v === '') return;

      const label = LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      // Try smart parsing for complex fields
      const parsed = parseComplexField(k, v);
      if (parsed !== null) {
        fields.push({ label, value: parsed });
        return;
      }

      // Simple scalar or unknown object
      const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (str === '{}' || str === '[]') return;
      fields.push({ label, value: str });
    });
  }

  return fields;
}

// ─── Single activity card ────────────────────────────────────────────────────

const ActivityCard: React.FC<{ n: AppNotification; highlight: boolean }> = ({ n, highlight }) => {
  const sev = SEV[n.severity];
  const fields = extractDataFields(n.raw);
  const vehicles: VehicleEntry[] | null =
    Array.isArray(n.raw.data?.vehicles) && (n.raw.data?.vehicles?.length ?? 0) > 0
      ? n.raw.data!.vehicles
      : null;

  return (
    <div
      id={`activity-${n.id}`}
      style={{
        background: highlight ? '#faf5ff' : '#fff',
        border: `1px solid ${highlight ? '#7c3aed' : sev.border}`,
        borderLeft: `4px solid ${highlight ? '#7c3aed' : sev.color}`,
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 12,
        transition: 'all 0.3s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sev.color, flexShrink: 0, display: 'inline-block', marginTop: 2,
          }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{n.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.description}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
          <Tag style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10, margin: 0,
            color: sev.color, background: sev.bg, border: `1px solid ${sev.border}`,
          }}>
            {sev.label}
          </Tag>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            {formatAgo(n.timestamp)}
          </div>
        </div>
      </div>

      {/* Divider */}
      {fields.length > 0 && (
        <div style={{ height: 1, background: '#f3f4f6', margin: '10px 0' }} />
      )}

      {/* All WS data fields */}
      {(fields.length > 0 || vehicles) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '6px 20px',
        }}>
          {fields.map(({ label, value }) => {
            const isMultiLine = value.includes('\n');
            return (
              <div
                key={label}
                style={{
                  display: 'flex', flexDirection: 'column',
                  gridColumn: isMultiLine ? '1 / -1' : undefined,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 12, color: '#374151', marginTop: 1,
                  wordBreak: 'break-word', lineHeight: 1.7,
                  whiteSpace: isMultiLine ? 'pre-line' : 'normal',
                }}>
                  {value}
                </span>
              </div>
            );
          })}
          {vehicles && <VehiclesField vehicles={vehicles} />}
        </div>
      )}

      {/* Full timestamp at bottom */}
      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
        {formatFull(n.timestamp)}
      </div>
    </div>
  );
};

// ─── Page component ───────────────────────────────────────────────────────────

interface SystemActivityPageProps {
  notifications: AppNotification[];
  connected: boolean;
  scrollToId?: string | null;
  onBack: () => void;
}

const SystemActivityPage: React.FC<SystemActivityPageProps> = ({ notifications, connected, scrollToId, onBack }) => {
  // Scroll to the clicked notification, or top if opened via "View all"
  useEffect(() => {
    if (scrollToId) {
      const el = document.getElementById(`activity-${scrollToId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [scrollToId, notifications]);
  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Header — matches other sub-pages pattern */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={onBack}
          style={{ color: '#6b7280', padding: '4px 8px' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            System Activity
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <WifiOutlined style={{ fontSize: 11, color: connected ? '#22c55e' : '#ef4444' }} />
            <span style={{ fontSize: 12, color: connected ? '#22c55e' : '#ef4444' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>
              {notifications.length} event{notifications.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              No system events yet. Events appear here as they arrive via WebSocket.
            </span>
          }
          style={{ padding: '60px 0' }}
        />
      ) : (
        notifications.map((n) => <ActivityCard key={n.id} n={n} highlight={n.id === scrollToId} />)
      )}
    </div>
  );
};

export default SystemActivityPage;