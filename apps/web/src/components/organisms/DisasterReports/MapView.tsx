import { API_ENDPOINTS } from '../../../config';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Spin } from 'antd';
import type { DisasterReport } from '../../../types';
import apiClient from '../../../lib/axios';
import DeployUnitModal from '../EmergencyTeams/modals/DeployUnitModal';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

const DUBLIN: [number, number] = [-6.2603, 53.3498];
const DEFAULT_ZOOM = 12;

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', MONITORING: 'Monitoring', RESOLVED: 'Resolved', ARCHIVED: 'Archived',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#ef4444', MONITORING: '#f59e0b', RESOLVED: '#22c55e', ARCHIVED: '#9ca3af',
};
const TYPE_EMOJI: Record<string, string> = {
  FIRE: '🔥', FLOOD: '🌊', EARTHQUAKE: '🌍', MEDICAL: '🚑',
  ACCIDENT: '🚗', STORM: '⛈️', OTHER: '⚠️',
};
const DEPT_COLOR: Record<string, string> = {
  FIRE: '#f97316', POLICE: '#3b82f6', MEDICAL: '#ec4899', IT: '#8b5cf6',
};
const DEPT_ICON: Record<string, string> = {
  FIRE: '🚒', POLICE: '🚔', MEDICAL: '🚑', IT: '💻',
};
const UNIT_STATUS_COLOR: Record<string, string> = {
  AVAILABLE: '#22c55e', DEPLOYED: '#f97316', OFFLINE: '#9ca3af', MAINTENANCE: '#eab308',
};

// Route colours: first is "assigned/best", rest are alternates
const ROUTE_COLORS = ['#22d3ee', '#f59e0b', '#8b5cf6', '#ec4899', '#22c55e', '#f97316'];

type StatusFilter = 'ALL' | 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ARCHIVED';
type MapStyle = 'streets' | 'dark' | 'satellite';

interface BlockedRoad {
  segment_id: string;
  road_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  points?: number[][];
  geojson: { type: string; geometry: { type: string; coordinates: number[][] }; properties: {} };
}
interface ChosenRoute {
  route_id: string;
  travel_time_seconds: number;
  length_meters: number;
  traffic_delay_seconds: number;
  points?: number[][];
  geojson: { type: string; geometry: { type: string; coordinates: number[][] }; properties: {} };
  instructions: string[];
}
interface ReroutePlan {
  id: string;
  disaster_id: string;
  status: string;
  blocked_roads: BlockedRoad[];
  vehicles_affected: number;
  routes_count: number;
  chosen_routes: ChosenRoute[];
  route_assignments: Record<string, string>; // vehicle_id → route_id
  capacity_usage: Record<string, { vehicles_assigned: number; capacity: number }>;
  estimated_times: Record<string, number>;
  created_at: string;
  impact_radius_km?: number;
  disaster_lat?: number;
  disaster_lng?: number;
}

interface EmergencyUnit {
  id: string; unit_code: string; unit_name: string; unit_type: string;
  department: string; unit_status: string; station_name: string; station_address: string;
  crew_count: number; capacity: number; commander_name: string; total_deployments: number;
  station?: { name: string; address: string; lat: number; lon: number };
  vehicle?: { model: string; license_plate: string; year: number };
  commander?: { name: string; phone: string; email: string };
  current_assignment?: { disaster_tracking_id: string; disaster_type: string; location: string; deployment_status: string } | null;
}

interface MapViewProps {
  reports: DisasterReport[];
  onDispatch:   (report: DisasterReport) => void;
  onEscalate:   (report: DisasterReport) => void;
  onResolve:    (report: DisasterReport) => void;
  onViewPhotos: (report: DisasterReport) => void;
  onViewLogs:        (report: DisasterReport) => void;
  onViewDeployedUnits: (report: DisasterReport) => void;
  evacuationPlanMap?: Record<string, string>;
  onViewEvacuationPlan?: (report: DisasterReport, planId: string) => void;
}

function createMarkerSvg(color: string, emoji: string, pulse: boolean): string {
  const pulseCircle = pulse ? `
    <circle cx="18" cy="18" r="18" fill="${color}" opacity="0.3">
      <animate attributeName="r" from="14" to="30" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.4" to="0" dur="1.8s" repeatCount="indefinite"/>
    </circle>` : '';
  return `
    <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      ${pulseCircle}
      <filter id="shadow${color.replace('#','')}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" filter="url(#shadow${color.replace('#','')})"/>
      <circle cx="18" cy="18" r="11" fill="white" opacity="0.25"/>
      <text x="18" y="23" text-anchor="middle" font-size="14">${emoji}</text>
    </svg>`;
}

function createStationSvg(color: string, icon: string, status: string): string {
  const pulse = status === 'DEPLOYED' ? `
    <circle cx="14" cy="14" r="14" fill="${color}" opacity="0.2">
      <animate attributeName="r" from="10" to="20" dur="2.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.3" to="0" dur="2.2s" repeatCount="indefinite"/>
    </circle>` : '';
  const statusColor = UNIT_STATUS_COLOR[status] ?? '#9ca3af';
  return `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      ${pulse}
      <filter id="stnShadow${color.replace('#','')}">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.45)"/>
      </filter>
      <rect x="3" y="3" width="26" height="26" rx="7" ry="7"
        fill="${color}" filter="url(#stnShadow${color.replace('#','')})" opacity="0.92"/>
      <rect x="3" y="3" width="26" height="26" rx="7" ry="7"
        fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
      <text x="16" y="21" text-anchor="middle" font-size="12">${icon}</text>
      <circle cx="25" cy="7" r="5" fill="${statusColor}" stroke="rgba(8,12,24,0.8)" stroke-width="1.5"/>
    </svg>`;
}

function createClusterHtml(count: number): string {
  const size = count < 5 ? 36 : count < 20 ? 44 : 52;
  const color = count < 5 ? '#f97316' : count < 20 ? '#ef4444' : '#7c3aed';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count<100?13:11}px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${count}</div>`;
}

function fmtTime(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m} min`;
}
function fmtDist(meters: number): string {
  return meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${meters} m`;
}

// ─── Component ───────────────────────────────────────────────────────────────
const MapView: React.FC<MapViewProps> = ({
  reports, onDispatch, onEscalate, onResolve, onViewPhotos, onViewLogs, onViewDeployedUnits,
  evacuationPlanMap = {}, onViewEvacuationPlan,
}) => {
  const containerRef      = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<mapboxgl.Map | null>(null);
  const markersRef        = useRef<mapboxgl.Marker[]>([]);
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const rerouteMarkerRef  = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const animFrameRef      = useRef<number[]>([]);
  const popupRef          = useRef<mapboxgl.Popup | null>(null);
  const boundsSetRef      = useRef(false);
  const styleMountedRef   = useRef(false);
  const rerouteModeRef    = useRef(false); // sync ref so renderMarkers can check without stale closure

  const [mapReady,        setMapReady]        = useState(false);
  const [mapError,        setMapError]        = useState('');
  const [styleMode,       setStyleMode]       = useState<MapStyle>('dark');
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('ACTIVE');
  const [drawerReport,    setDrawerReport]    = useState<DisasterReport | null>(null);
  const [drawerUnit,      setDrawerUnit]      = useState<EmergencyUnit | null>(null);
  const [is3D,            setIs3D]            = useState(false);
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [mapCtrlOpen,     setMapCtrlOpen]     = useState(false);
  const [showStations,    setShowStations]    = useState(true);
  const [units,           setUnits]           = useState<EmergencyUnit[]>([]);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [reroutePlans,    setReroutePlans]    = useState<ReroutePlan[]>([]);
  const [rerouteMode,     setRerouteMode]     = useState(false);
  const [rerouteDisaster, setRerouteDisaster] = useState<DisasterReport | null>(null);
  const [reroutePlan,     setReroutePlan]     = useState<ReroutePlan | null>(null);
  const [isMobile,        setIsMobile]        = useState(() => window.innerWidth < 950 || window.innerHeight < 500);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 950 || window.innerHeight < 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isDark = styleMode === 'dark';

  const visibleReports = reports.filter(r =>
    statusFilter === 'ALL' ? true : r.disasterStatus === statusFilter
  );

  // ── Layer management ────────────────────────────────────────────────────────
  // Track sources and layers separately to avoid removal order issues
  const sourceIdsRef = useRef<string[]>([]);
  const layerIdsRef  = useRef<string[]>([]);

  const clearRerouteLayers = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    // Always remove layers before sources
    layerIdsRef.current.forEach(id => {
      try { if (m.getLayer(id)) m.removeLayer(id); } catch {}
    });
    sourceIdsRef.current.forEach(id => {
      try { if (m.getSource(id)) m.removeSource(id); } catch {}
    });
    layerIdsRef.current  = [];
    sourceIdsRef.current = [];
  }, []);

  // Add a GeoJSON source + line layers safely
  const addLineLayer = (
    m: mapboxgl.Map,
    srcId: string,
    geojson: any,
    color: string,
    width: number,
    opacity: number,
    dashed: boolean,
    glowWidth?: number,
  ) => {
    try {
      if (m.getSource(srcId)) {
        (m.getSource(srcId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        m.addSource(srcId, { type: 'geojson', data: geojson });
        sourceIdsRef.current.push(srcId);
      }
      // Glow layer (if glowWidth provided)
      if (glowWidth) {
        const glowId = `${srcId}-glow`;
        if (!m.getLayer(glowId)) {
          m.addLayer({ id: glowId, type: 'line', source: srcId,
            paint: { 'line-color': color, 'line-width': glowWidth, 'line-opacity': 0.18, 'line-blur': 4 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });
          layerIdsRef.current.push(glowId);
        }
      }
      // Main line layer
      const lineId = `${srcId}-line`;
      if (!m.getLayer(lineId)) {
        const paint: mapboxgl.LinePaint = {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
        };
        if (dashed) (paint as any)['line-dasharray'] = [3, 2];
        m.addLayer({ id: lineId, type: 'line', source: srcId,
          paint,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
        layerIdsRef.current.push(lineId);
      }
    } catch (err) {
    }
  };

  // Draw blocked roads (dashed red) + reroute lines
  const drawImpactCircle = useCallback((plan: ReroutePlan) => {
    const m = mapRef.current;
    if (!m || !plan.impact_radius_km || !plan.disaster_lat || !plan.disaster_lng) return;

    const srcId  = `impact-circle-${plan.id}`;
    const fillId = `impact-fill-${plan.id}`;
    const lineId = `impact-line-${plan.id}`;
    const labelId = `impact-label-${plan.id}`;

    // Remove previous if any
    [fillId, lineId, labelId].forEach(id => { try { if (m.getLayer(id)) m.removeLayer(id); } catch {} });
    try { if (m.getSource(srcId)) m.removeSource(srcId); } catch {}
    sourceIdsRef.current.push(srcId);
    layerIdsRef.current.push(fillId, lineId, labelId);

    // Generate circle polygon (GeoJSON) using Turf-style math
    const R_EARTH = 6371;
    const radiusKm = plan.impact_radius_km;
    const centerLat = plan.disaster_lat;
    const centerLng = plan.disaster_lng;
    const points = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dLat = (radiusKm / R_EARTH) * (180 / Math.PI) * Math.sin(angle);
      const dLng = (radiusKm / R_EARTH) * (180 / Math.PI) * Math.cos(angle) / Math.cos(centerLat * Math.PI / 180);
      coords.push([centerLng + dLng, centerLat + dLat]);
    }

    m.addSource(srcId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [centerLng, centerLat + (radiusKm / R_EARTH) * (180 / Math.PI)] }, properties: { label: `⚠️ ${radiusKm} km impact radius` } },
        ],
      },
    });

    // Fill — semi-transparent red/orange
    m.addLayer({ id: fillId, type: 'fill', source: srcId, filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.08 } });

    // Dashed border
    m.addLayer({ id: lineId, type: 'line', source: srcId, filter: ['==', '$type', 'Polygon'],
      paint: { 'line-color': '#ef4444', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [4, 3] } });

    // Label at top of circle
    m.addLayer({ id: labelId, type: 'symbol', source: srcId, filter: ['==', '$type', 'Point'],
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-anchor': 'bottom',
        'text-offset': [0, -0.3],
      },
      paint: { 'text-color': '#fca5a5', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.5 },
    });
  }, []);

    const drawRerouteOnMap = useCallback((plan: ReroutePlan) => {
    const m = mapRef.current;
    if (!m || !m.isStyleLoaded()) return;

    clearRerouteLayers();

    const assignedIds = new Set(Object.values(plan.route_assignments));
    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    const extendBounds = (lng: number, lat: number) => {
      if (lng && lat) { bounds.extend([lng, lat]); hasBounds = true; }
    };

    // ── Draw active routes ONLY (so blocked roads render on top) ──
    plan.chosen_routes.forEach((route, i) => {
      const isAssigned = assignedIds.has(route.route_id);
      if (!isAssigned) return; // skip alternates

      const srcId = `route-${plan.id}-${i}`;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];

      let coordinates: number[][];
      if (route.points && route.points.length > 1) {
        coordinates = route.points.map(([lat, lon]: number[]) => [lon, lat]);
      } else if (route.geojson?.geometry?.coordinates?.length > 1) {
        coordinates = route.geojson.geometry.coordinates;
      } else {
        return;
      }

      const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} };
      addLineLayer(m, srcId, geojson, color, 6, 1, false, 16);
      coordinates.forEach(([lng, lat]) => extendBounds(lng, lat));
    });

    // ── Draw blocked roads LAST — Google Maps style with red circle markers ──
    const blockedMarkerSvg = `<svg width="11" height="11" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill="#e8281a" stroke="white" stroke-width="2.5"/>
      <rect x="6" y="12" width="16" height="4" rx="2" fill="white"/>
    </svg>`;

    plan.blocked_roads.forEach((road, i) => {
      const srcId    = `blocked-${plan.id}-${i}`;
      const casingId = `blocked-casing-${plan.id}-${i}`;
      const lineId   = `blocked-line-${plan.id}-${i}`;
      const startLng = road.start_lng;
      const startLat = road.start_lat;
      const endLng   = road.end_lng;
      const endLat   = road.end_lat;

      let coordinates: number[][];
      if (road.points && road.points.length > 1) {
        coordinates = road.points.map(([lat, lon]: number[]) => [lon, lat]);
      } else {
        coordinates = [[startLng, startLat], [endLng ?? startLng, endLat ?? startLat]];
      }

      const geojson: any = { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} };
      try { m.addSource(srcId, { type: 'geojson', data: geojson }); } catch {}
      sourceIdsRef.current.push(srcId);

      // Dark casing
      try { m.addLayer({ id: casingId, type: 'line', source: srcId,
        paint: { 'line-color': '#1a0000', 'line-width': 14, 'line-opacity': 0.85 } }); } catch {}
      layerIdsRef.current.push(casingId);

      // Bright red line
      try { m.addLayer({ id: lineId, type: 'line', source: srcId,
        paint: { 'line-color': '#e8281a', 'line-width': 8, 'line-opacity': 1 } }); } catch {}
      layerIdsRef.current.push(lineId);

      // Red circle markers at every coordinate point
      coordinates.forEach(([lng, lat], ptIdx) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:11px;height:11px;cursor:default;';
        el.innerHTML = blockedMarkerSvg;
        const mk = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(m);
        markersRef.current.push(mk);
        extendBounds(lng, lat);
      });
    });

    // Fit map to show all routes + blocked roads, preserving current 3D pitch/bearing
    if (hasBounds && !bounds.isEmpty()) {
      m.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000, pitch: m.getPitch(), bearing: m.getBearing() });
    }
  }, [clearRerouteLayers]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.TEAMS.LIST);
        const list: EmergencyUnit[] = res.data.units ?? [];
        const detailed = await Promise.all(
          list.map(async (u) => {
            try { const d = await apiClient.get(API_ENDPOINTS.TEAMS.UNIT_BY_ID(u.id)); return { ...u, ...d.data } as EmergencyUnit; }
            catch { return u; }
          })
        );
        setUnits(detailed);
      } catch { }
    };
    const fetchReroutePlans = async () => {
      try {
        const res = await apiClient.get('/reroute/plans');
        // API may return array directly or wrapped in an object
        const plans = Array.isArray(res.data) ? res.data : (res.data?.plans ?? res.data?.results ?? []);
        setReroutePlans(plans);
      } catch { }
    };
    fetchUnits();
    fetchReroutePlans();
  }, []);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapboxgl.accessToken) { setMapError('Mapbox token not configured.'); return; }
    if (!containerRef.current || mapRef.current) return;

    const initUrls: Record<MapStyle, string> = { streets: 'mapbox://styles/mapbox/streets-v12', dark: 'mapbox://styles/mapbox/dark-v11', satellite: 'mapbox://styles/mapbox/satellite-streets-v12' };

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: initUrls[styleMode],
      center: DUBLIN, zoom: DEFAULT_ZOOM,
      antialias: true,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    mapRef.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapRef.current.on('load', () => {
      const m = mapRef.current!;
      const initStyle = styleMode;

      m.on('click', () => {
        setDrawerReport(null);
        setDrawerUnit(null);
      });

      m.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
      m.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 90.0], 'sky-atmosphere-sun-intensity': initStyle === 'dark' ? 5 : 15 } });
      m.setFog(initStyle === 'dark'
        ? { color: 'rgb(20,20,40)', 'high-color': 'rgb(10,20,80)', 'horizon-blend': 0.08, 'space-color': 'rgb(5,5,20)', 'star-intensity': 0.8 }
        : { color: 'rgb(220,226,235)', 'high-color': 'rgb(36,92,223)', 'horizon-blend': 0.06, 'space-color': 'rgb(11,11,25)', 'star-intensity': 0.4 });
      const layers = m.getStyle().layers ?? [];
      const labelLayerId = layers.find(l => l.type === 'symbol' && (l.layout as any)?.['text-field'])?.id;
      const buildingColors = initStyle === 'dark'
        ? ['interpolate', ['linear'], ['get', 'height'], 0, '#1e293b', 50, '#334155', 120, '#475569'] as any
        : ['interpolate', ['linear'], ['get', 'height'], 0, '#e2e8f0', 30, '#cbd5e1', 80, '#cbd5e1', 150, '#64748b'] as any;
      m.addLayer({ id: 'drs-3d-buildings', source: 'composite', 'source-layer': 'building', filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 14,
        paint: { 'fill-extrusion-color': buildingColors, 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']], 'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']], 'fill-extrusion-opacity': initStyle === 'dark' ? 0.9 : 0.75 },
      }, labelLayerId);
      setMapReady(true);
    });

    return () => {
      (window as any).__drsMap = undefined;
      (window as any).__drsMapClusterPick = undefined;
      markersRef.current.forEach(m => m.remove());
      stationMarkersRef.current.forEach(m => m.remove());
      rerouteMarkerRef.current?.remove();
      markersRef.current = [];
      stationMarkersRef.current = [];
      layerIdsRef.current  = [];
      sourceIdsRef.current = [];
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style toggle ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (!styleMountedRef.current) { styleMountedRef.current = true; return; }
    const m = mapRef.current;
    const center = m.getCenter(), zoom = m.getZoom(), pitch = m.getPitch(), bearing = m.getBearing();
    const urls: Record<MapStyle, string> = { streets: 'mapbox://styles/mapbox/streets-v12', dark: 'mapbox://styles/mapbox/dark-v11', satellite: 'mapbox://styles/mapbox/satellite-streets-v12' };
    m.setStyle(urls[styleMode]);
    layerIdsRef.current  = []; // style change removes all custom layers
    sourceIdsRef.current = [];
    m.once('style.load', () => {
      m.jumpTo({ center, zoom, pitch, bearing });
      if (!m.getSource('mapbox-dem')) m.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
      if (!m.getLayer('sky')) m.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 90.0], 'sky-atmosphere-sun-intensity': styleMode === 'dark' ? 5 : 15 } });
      m.setFog(styleMode === 'dark'
        ? { color: 'rgb(20,20,40)', 'high-color': 'rgb(10,20,80)', 'horizon-blend': 0.08, 'space-color': 'rgb(5,5,20)', 'star-intensity': 0.8 }
        : styleMode === 'satellite'
          ? { color: 'rgb(180,210,230)', 'high-color': 'rgb(36,92,223)', 'horizon-blend': 0.04, 'space-color': 'rgb(11,11,25)', 'star-intensity': 0.2 }
          : { color: 'rgb(220,226,235)', 'high-color': 'rgb(36,92,223)', 'horizon-blend': 0.06, 'space-color': 'rgb(11,11,25)', 'star-intensity': 0.4 });
      if (styleMode !== 'satellite') {
        const layers = m.getStyle().layers ?? [];
        const labelLayerId = layers.find(l => l.type === 'symbol' && (l.layout as any)?.['text-field'])?.id;
        if (!m.getLayer('drs-3d-buildings')) m.addLayer({
          id: 'drs-3d-buildings', source: 'composite', 'source-layer': 'building', filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 14,
          paint: { 'fill-extrusion-color': styleMode === 'dark' ? ['interpolate', ['linear'], ['get', 'height'], 0, '#1e293b', 50, '#334155', 120, '#475569'] : ['interpolate', ['linear'], ['get', 'height'], 0, '#e2e8f0', 30, '#cbd5e1', 80, '#cbd5e1', 150, '#64748b'], 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']], 'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']], 'fill-extrusion-opacity': styleMode === 'dark' ? 0.9 : 0.75 },
        }, labelLayerId);
      }
      // Re-draw active reroute layers if in reroute mode
      if (rerouteMode && reroutePlan) {
        drawRerouteOnMap(reroutePlan);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleMode, mapReady]);

  // ── Clear layers when drawer closes ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    if (!drawerReport || rerouteMode) clearRerouteLayers();
  }, [drawerReport, mapReady, rerouteMode, clearRerouteLayers]);

  // ── Station markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    stationMarkersRef.current.forEach(m => m.remove());
    stationMarkersRef.current = [];
    if (!showStations || rerouteMode) return;

    units.forEach(unit => {
      const lat = unit.station?.lat;
      const lon = unit.station?.lon;
      if (!lat || !lon || !mapRef.current) return;
      const color = DEPT_COLOR[unit.department] ?? '#6b7280';
      const icon  = DEPT_ICON[unit.department] ?? '🏢';
      const el = document.createElement('div');
      el.style.cssText = 'width:32px;height:32px;cursor:pointer;';
      el.innerHTML = createStationSvg(color, icon, unit.unit_status);
      el.addEventListener('click', (e) => { e.stopPropagation(); setDrawerReport(null); setDrawerUnit(unit); });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(mapRef.current!);
      stationMarkersRef.current.push(marker);
    });
  }, [units, mapReady, showStations, rerouteMode]);

  // ── Reroute mode: render routes + disaster pin ──────────────────────────────
  useEffect(() => {
    if (!mapReady || !rerouteMode || !rerouteDisaster || !reroutePlan) return;
    const m = mapRef.current;
    if (!m) return;

    // Hide normal markers
    markersRef.current.forEach(mk => mk.getElement().style.opacity = '0');
    stationMarkersRef.current.forEach(mk => mk.getElement().style.opacity = '0');

    // Place pulsing disaster pin
    rerouteMarkerRef.current?.remove();
    const { lat, lon } = rerouteDisaster.locationCoords;
    if (lat && lon) {
      const color = SEVERITY_COLOR[rerouteDisaster.severity.toUpperCase()] ?? '#ef4444';
      const emoji = TYPE_EMOJI[rerouteDisaster.type.toUpperCase()] ?? '⚠️';
      const el = document.createElement('div');
      el.style.cssText = 'width:36px;height:44px;';
      el.innerHTML = createMarkerSvg(color, emoji, true);
      rerouteMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lon, lat]).addTo(m);
    }

    // Draw routes, impact circle, then start vehicle animations
    if (m.isStyleLoaded()) {
      drawRerouteOnMap(reroutePlan);
      drawImpactCircle(reroutePlan);
      startVehicleAnimations(reroutePlan);
    } else {
      m.once('style.load', () => { drawRerouteOnMap(reroutePlan); drawImpactCircle(reroutePlan); startVehicleAnimations(reroutePlan); });
    }

    return () => {
      rerouteMarkerRef.current?.remove();
      rerouteMarkerRef.current = null;
      animFrameRef.current.forEach(id => cancelAnimationFrame(id));
      animFrameRef.current = [];
      vehicleMarkersRef.current.forEach(mk => mk.remove());
      vehicleMarkersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerouteMode, rerouteDisaster, reroutePlan, mapReady, drawRerouteOnMap]);

  const exitRerouteMode = useCallback(() => {
    rerouteModeRef.current = false;
    clearRerouteLayers();
    rerouteMarkerRef.current?.remove();
    rerouteMarkerRef.current = null;
    // Stop vehicle animations and remove markers
    animFrameRef.current.forEach(id => cancelAnimationFrame(id));
    animFrameRef.current = [];
    vehicleMarkersRef.current.forEach(m => m.remove());
    vehicleMarkersRef.current = [];
    markersRef.current.forEach(mk => mk.getElement().style.opacity = '1');
    stationMarkersRef.current.forEach(mk => mk.getElement().style.opacity = '1');
    setRerouteMode(false);
    setRerouteDisaster(null);
    setReroutePlan(null);
  }, [clearRerouteLayers]);

  // ── Vehicle movement animation ─────────────────────────────────────────────
  const startVehicleAnimations = useCallback((plan: ReroutePlan) => {
    const m = mapRef.current;
    if (!m) return;

    // Clear any existing vehicle markers/animations
    animFrameRef.current.forEach(id => cancelAnimationFrame(id));
    animFrameRef.current = [];
    vehicleMarkersRef.current.forEach(mk => mk.remove());
    vehicleMarkersRef.current = [];

    const assignedIds = new Set(Object.values(plan.route_assignments));

    plan.chosen_routes.forEach((route, routeIdx) => {
      if (!assignedIds.has(route.route_id)) return;

      // Build [lon, lat] coordinate array
      let coords: [number, number][];
      if (route.points && route.points.length > 1) {
        coords = route.points.map(([lat, lon]: number[]) => [lon, lat] as [number, number]);
      } else if (route.geojson?.geometry?.coordinates?.length > 1) {
        coords = route.geojson.geometry.coordinates as [number, number][];
      } else return;

      const vehicleCount = plan.capacity_usage[route.route_id]?.vehicles_assigned ?? 1;
      const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];

      for (let v = 0; v < vehicleCount; v++) {
        // Stagger start position so vehicles don't overlap
        const staggerOffset = v / vehicleCount; // fractional offset 0..1
        const lapMs = route.travel_time_seconds > 0 ? route.travel_time_seconds * 1000 : 60000;

        // Persistent progress: store lap start time in sessionStorage keyed by route+vehicle
        const storageKey = `drs_vehicle_${plan.id}_${route.route_id}_${v}`;
        let lapStartMs: number;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          lapStartMs = parseInt(stored, 10);
        } else {
          // Offset start time by stagger so vehicles are spread across the route
          lapStartMs = Date.now() - Math.floor(staggerOffset * lapMs);
          localStorage.setItem(storageKey, String(lapStartMs));
        }

        // Create vehicle marker element
        const el = document.createElement('div');
        el.style.cssText = 'width:20px;height:20px;';
        el.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" fill="${color}" opacity="0.9" stroke="white" stroke-width="1.5"/>
          <circle cx="10" cy="10" r="3" fill="white" opacity="0.8"/>
        </svg>`;

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords[0])
          .addTo(m);
        vehicleMarkersRef.current.push(marker);

        const animate = (_ts: number) => {
          if (!rerouteModeRef.current) return;

          // Derive progress from wall-clock time so it survives refresh
          const elapsed = Date.now() - lapStartMs;
          const progress = (elapsed % lapMs) / lapMs;

          const idx = Math.floor(progress * (coords.length - 1));
          const next = Math.min(idx + 1, coords.length - 1);
          const frac = progress * (coords.length - 1) - idx;
          const lng = coords[idx][0] + (coords[next][0] - coords[idx][0]) * frac;
          const lat = coords[idx][1] + (coords[next][1] - coords[idx][1]) * frac;
          marker.setLngLat([lng, lat]);

          const frameId = requestAnimationFrame(animate);
          animFrameRef.current.push(frameId);
        };

        const frameId = requestAnimationFrame(animate);
        animFrameRef.current.push(frameId);
      }
    });
  }, []);

  // ── Disaster markers ────────────────────────────────────────────────────────
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    if (rerouteModeRef.current) return; // don't render disaster markers in reroute mode
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    popupRef.current?.remove();

    (window as any).__drsMap = (action: string, id: string) => {
      const report = reports.find(r => r.id === id);
      if (!report) return;
      setDrawerReport(null);
      if (action === 'dispatch')  onDispatch(report);
      if (action === 'escalate')  onEscalate(report);
      if (action === 'resolve')   onResolve(report);
      if (action === 'photos')    onViewPhotos(report);
      if (action === 'logs')      onViewLogs(report);
      if (action === 'units')     onViewDeployedUnits(report);
    };

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;
    const clusterRadius = 0.008;
    const clustered: Record<string, DisasterReport[]> = {};

    visibleReports.forEach(r => {
      const { lat, lon } = r.locationCoords;
      if (!lat || !lon) return;
      const key = `${Math.round(lat / clusterRadius) * clusterRadius},${Math.round(lon / clusterRadius) * clusterRadius}`;
      if (!clustered[key]) clustered[key] = [];
      clustered[key].push(r);
    });

    Object.entries(clustered).forEach(([key, group]) => {
      if (!mapRef.current) return;
      const [latStr, lonStr] = key.split(',');
      const centerLat = parseFloat(latStr), centerLon = parseFloat(lonStr);
      if (!centerLat || !centerLon) return;
      bounds.extend([centerLon, centerLat]);
      hasCoords = true;

      if (group.length > 1) {
        const el = document.createElement('div');
        el.innerHTML = createClusterHtml(group.length);
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!mapRef.current) return;
          popupRef.current?.remove();
          const rows = group.map(r => {
            const sc = SEVERITY_COLOR[r.severity.toUpperCase()] ?? '#9ca3af';
            const em = TYPE_EMOJI[r.type.toUpperCase()] ?? '⚠️';
            return `<div onclick="window.__drsMapClusterPick&&window.__drsMapClusterPick('${r.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:7px;cursor:pointer;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'"><span style="font-size:16px">${em}</span><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.type} — ${r.reportId}</div><div style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.location||'Unknown'}</div></div><span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;background:${sc}20;color:${sc};border:1px solid ${sc}40;flex-shrink:0;">${r.severity.toUpperCase()}</span></div>`;
          }).join('<div style="height:1px;background:#f3f4f6;margin:2px 0"></div>');
          const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:280px;"><div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">${group.length} Incidents at this location</div>${rows}</div>`;
          (window as any).__drsMapClusterPick = (id: string) => {
            const report = group.find(r => r.id === id);
            if (!report) return;
            popupRef.current?.remove();
            setDrawerReport(report);
          };
          const p = new mapboxgl.Popup({ offset: [0,-20], closeButton: true, closeOnClick: false, maxWidth: '300px' }).setLngLat([centerLon, centerLat]).setHTML(html).addTo(mapRef.current!);
          popupRef.current = p;
        });
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([centerLon, centerLat]).addTo(mapRef.current);
        markersRef.current.push(marker);
      } else {
        const report = group[0];
        const sevKey = report.severity.toUpperCase();
        const color = SEVERITY_COLOR[sevKey] ?? '#9ca3af';
        const emoji = TYPE_EMOJI[report.type.toUpperCase()] ?? '⚠️';
        const doPulse = report.disasterStatus === 'ACTIVE' && (sevKey === 'CRITICAL' || sevKey === 'HIGH');
        const el = document.createElement('div');
        el.style.cssText = 'width:36px;height:44px;cursor:pointer;';
        el.innerHTML = createMarkerSvg(color, emoji, doPulse);
        el.addEventListener('click', (e) => { e.stopPropagation(); setDrawerUnit(null); setDrawerReport(report); });
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([report.locationCoords.lon, report.locationCoords.lat]).addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });

    if (hasCoords && !bounds.isEmpty() && !boundsSetRef.current) {
      boundsSetRef.current = true;
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
    }
  }, [visibleReports, mapReady, reports, onDispatch, onEscalate, onResolve, onViewPhotos, onViewLogs, onViewDeployedUnits]);

  const enterRerouteMode = useCallback(async (disaster: DisasterReport) => {
    // Set ref immediately so any renderMarkers calls during the async fetch bail out
    rerouteModeRef.current = true;
    // Immediately wipe existing disaster markers from the map DOM — don't wait for
    // state/re-renders. This ensures no markers flash during the async plan fetch even
    // if an intermediate re-render tries to call renderMarkers before setRerouteMode(true) fires.
    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];
    stationMarkersRef.current.forEach(mk => mk.getElement().style.opacity = '0');
    let plans = reroutePlans;
    try {
      const res = await apiClient.get('/reroute/plans');
      plans = Array.isArray(res.data) ? res.data : (res.data?.plans ?? res.data?.results ?? []);
      setReroutePlans(plans);
    } catch { }

    const plan = plans.find((p: ReroutePlan) => p.disaster_id === disaster.id);
    if (!plan) {
      // Abort: restore normal state so the map isn't left blank with no markers
      rerouteModeRef.current = false;
      stationMarkersRef.current.forEach(mk => mk.getElement().style.opacity = '1');
      setTimeout(renderMarkers, 0); // rebuild disaster markers on next tick
      return;
    }
    clearRerouteLayers();
    setDrawerReport(null);
    setRerouteDisaster(disaster);
    setReroutePlan(plan);
    setRerouteMode(true);
  }, [reroutePlans, clearRerouteLayers, renderMarkers]);

  useEffect(() => { boundsSetRef.current = false; }, [statusFilter]);
  useEffect(() => { if (!rerouteMode) renderMarkers(); }, [renderMarkers, rerouteMode]);

  const resetView = () => mapRef.current?.flyTo({ center: DUBLIN, zoom: DEFAULT_ZOOM, duration: 1000 });
  const toggle3D = () => {
    if (!mapRef.current) return;
    const next = !is3D;
    setIs3D(next);
    mapRef.current.easeTo({ pitch: next ? 50 : 0, bearing: next ? -10 : 0, duration: 800 });
  };

  if (mapError) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:500, background:'#f9fafb', borderRadius:12, color:'#374151' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🗺️</div>
        <div style={{ fontWeight:600, marginBottom:6 }}>Map unavailable</div>
        <div style={{ fontSize:12, color:'#9ca3af', textAlign:'center', maxWidth:300 }}>{mapError}</div>
      </div>
    );
  }

  const btnStyle = (base: React.CSSProperties): React.CSSProperties => ({ fontFamily:"'Courier New',monospace", ...base });

  return (
    <div style={{ position:'relative', borderRadius:14, overflow:'hidden', height:580, boxShadow: isDark ? '0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.12)' }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes drawerSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes rerouteFadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rerouteFadeInCenter { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .mapboxgl-popup-content { padding:12px 14px!important;border-radius:10px!important;box-shadow:0 4px 20px rgba(0,0,0,0.15)!important; }
        .mapboxgl-popup-close-button { font-size:16px!important;color:#9ca3af!important;padding:4px 8px!important; }
        .drs-compact-reroute .mapboxgl-ctrl-top-right { margin-top:38px!important; }
        .drs-compact-reroute .mapboxgl-ctrl-top-left  { margin-top:38px!important; }
      `}</style>

      <div ref={containerRef} style={{ width:'100%', height:'100%' }} className={rerouteMode && isMobile ? 'drs-compact-reroute' : ''} />

      {(drawerReport || drawerUnit) && (
        <div onClick={() => { setDrawerReport(null); setDrawerUnit(null); }} style={{ position:'absolute', inset:0, zIndex:15, pointerEvents:'auto', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(1.5px)', transition:'opacity 0.2s' }} />
      )}

      {isDark && <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1, background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)' }} />}
      {isDark && <>
        <div style={{ position:'absolute', top:0, left:0, width:60, height:60, borderTop:'2px solid rgba(34,211,238,0.4)', borderLeft:'2px solid rgba(34,211,238,0.4)', borderRadius:'14px 0 0 0', zIndex:3, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, right:0, width:60, height:60, borderTop:'2px solid rgba(34,211,238,0.4)', borderRight:'2px solid rgba(34,211,238,0.4)', borderRadius:'0 14px 0 0', zIndex:3, pointerEvents:'none' }} />
      </>}

      {!mapReady && (
        <div style={{ position:'absolute', inset:0, background: isDark ? 'rgba(8,14,28,0.85)' : 'rgba(255,255,255,0.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <Spin size="large" />
          <div style={{ marginTop:12, color: isDark ? '#cbd5e1' : '#374151', fontWeight:500, fontSize:13, fontFamily:'monospace' }}>
            {isDark ? 'INITIALIZING EOC MAP...' : 'Loading map...'}
          </div>
        </div>
      )}

      {/* ── REROUTE MODE BANNER ── */}
      {rerouteMode && rerouteDisaster && reroutePlan && (
        isMobile ? (
          /* Mobile: full-width edge-to-edge strip at top */
          <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, animation:'rerouteFadeIn 0.25s ease-out' }}>
            <div style={{ background:'rgba(8,12,24,0.96)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(34,211,238,0.25)', padding:'7px 12px', display:'flex', alignItems:'center', gap:8, fontFamily:"'Courier New',monospace" }}>
              <span style={{ fontSize:13 }}>🛣️</span>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#22d3ee', letterSpacing:'0.06em' }}>
                  {TYPE_EMOJI[rerouteDisaster.type.toUpperCase()] ?? '⚠️'} {rerouteDisaster.reportId}
                </span>
                <span style={{ fontSize:10, color:'#94a3b8', marginLeft:6 }}>
                  {reroutePlan.blocked_roads.length} blocked · {reroutePlan.chosen_routes.length} routes · {reroutePlan.vehicles_affected} vehicles
                </span>
              </div>
              <button onClick={exitRerouteMode} style={btnStyle({ padding:'5px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.12)', color:'#f87171', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 })}>
                ✕ Exit
              </button>
            </div>
          </div>
        ) : (
          /* Desktop: floating centered card */
          <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:20, animation:'rerouteFadeInCenter 0.25s ease-out' }}>
            <div style={{ background:'rgba(8,12,24,0.95)', backdropFilter:'blur(16px)', borderRadius:12, padding:'10px 16px', border:'1px solid rgba(34,211,238,0.3)', boxShadow:'0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.1)', display:'flex', alignItems:'center', gap:12, fontFamily:"'Courier New',monospace" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#22d3ee', letterSpacing:'0.08em', marginBottom:2 }}>🛣️ REROUTE VIEW — {TYPE_EMOJI[rerouteDisaster.type.toUpperCase()] ?? '⚠️'} {rerouteDisaster.reportId}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>
                  {reroutePlan.blocked_roads.length} road{reroutePlan.blocked_roads.length !== 1 ? 's' : ''} blocked · {reroutePlan.chosen_routes.length} routes available · {reroutePlan.vehicles_affected} vehicle{reroutePlan.vehicles_affected !== 1 ? 's' : ''} affected
                </div>
              </div>
              <button onClick={exitRerouteMode} style={btnStyle({ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.12)', color:'#f87171', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 })}>
                ✕ Exit Reroutes
              </button>
            </div>
          </div>
        )
      )}

      {/* ── REROUTE MODE LEGEND ── */}
      {rerouteMode && reroutePlan && (() => {
        const assignedIds = new Set(Object.values(reroutePlan.route_assignments));
        return isMobile ? (
          /* Mobile: horizontal scrollable chip strip pinned to bottom */
          <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:10, background:'rgba(8,12,24,0.93)', backdropFilter:'blur(12px)', borderTop:'1px solid rgba(34,211,238,0.15)', fontFamily:"'Courier New',monospace" }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', overflowX:'auto', scrollbarWidth:'none' }}>
              {reroutePlan.chosen_routes.filter(route => assignedIds.has(route.route_id)).map((route) => {
                const routeIdx = reroutePlan.chosen_routes.indexOf(route);
                const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
                const vehicles = reroutePlan.capacity_usage[route.route_id]?.vehicles_assigned ?? 0;
                return (
                  <div key={route.route_id} style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, background:`${color}18`, border:`1px solid ${color}60`, borderRadius:8, padding:'4px 8px' }}>
                    <div style={{ width:18, height:3, borderRadius:3, background:color, boxShadow:`0 0 4px ${color}` }} />
                    <span style={{ fontSize:9, fontWeight:700, color:'#f1f5f9', whiteSpace:'nowrap' }}>
                      R{routeIdx+1} ★ · {fmtTime(route.travel_time_seconds)}{vehicles > 0 ? ` · ${vehicles}v` : ''}
                    </span>
                  </div>
                );
              })}
              <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'4px 8px' }}>
                <div style={{ width:18, height:3, borderRadius:3, background:'#ef4444', backgroundImage:'repeating-linear-gradient(90deg,#ef4444 0,#ef4444 4px,transparent 4px,transparent 7px)' }} />
                <span style={{ fontSize:9, color:'#f87171', whiteSpace:'nowrap' }}>Blocked ({reroutePlan.blocked_roads.length})</span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop: floating card bottom-left */
          <div style={{ position:'absolute', bottom:36, left:14, zIndex:10, background:'rgba(8,12,24,0.92)', backdropFilter:'blur(12px)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(34,211,238,0.2)', boxShadow:'0 4px 20px rgba(0,0,0,0.4)', minWidth:220, fontFamily:"'Courier New',monospace" }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:10 }}>◈ ROUTES</div>
            {reroutePlan.chosen_routes.filter(route => assignedIds.has(route.route_id)).map((route) => {
              const routeIdx = reroutePlan.chosen_routes.indexOf(route);
              const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
              const vehicles = reroutePlan.capacity_usage[route.route_id]?.vehicles_assigned ?? 0;
              return (
                <div key={route.route_id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:28, height:3, borderRadius:3, background:color, flexShrink:0, boxShadow:`0 0 6px ${color}` }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#ffffff' }}>
                      Route {routeIdx+1} · ACTIVE
                    </div>
                    <div style={{ fontSize:9, color:'#94a3b8' }}>{fmtTime(route.travel_time_seconds)} · {fmtDist(route.length_meters)} {vehicles > 0 ? `· ${vehicles} vehicle${vehicles>1?'s':''}` : ''}</div>
                  </div>
                </div>
              );
            })}
            <div style={{ height:1, background:'rgba(34,211,238,0.1)', margin:'8px 0' }} />
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:3, borderRadius:3, background:'#ef4444', flexShrink:0, backgroundImage:'repeating-linear-gradient(90deg,#ef4444 0,#ef4444 6px,transparent 6px,transparent 10px)' }} />
              <div style={{ fontSize:9, color:'#f87171' }}>Blocked road{reroutePlan.blocked_roads.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        );
      })()}

      {/* ── FILTER DROPDOWN — hidden in reroute mode ── */}
      {!rerouteMode && (() => {
        const activeFilter = [
          { key:'ACTIVE', label:'Active', color:'#ef4444' },
          { key:'MONITORING', label:'Monitoring', color:'#f59e0b' },
          { key:'RESOLVED', label:'Resolved', color:'#22c55e' },
          { key:'ARCHIVED', label:'Archived', color:'#cbd5e1' },
          { key:'ALL', label:'All', color:'#22d3ee' },
        ].find(f => f.key === statusFilter)!;
        const count = statusFilter === 'ALL' ? reports.length : reports.filter(r => r.disasterStatus === statusFilter).length;
        return (
          <div style={{ position:'absolute', top:12, left:12, zIndex:10 }}>
            <button onClick={() => { setFilterOpen(o => !o); setMapCtrlOpen(false); }} style={btnStyle({ height:34, padding:'0 12px', borderRadius:10, border:`1px solid ${filterOpen ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.2)'}`, background:'rgba(10,15,30,0.88)', backdropFilter:'blur(12px)', color:'#f1f5f9', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:8, letterSpacing:'0.04em', boxShadow: filterOpen ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 10px rgba(0,0,0,0.4)', transition:'all 0.15s' })}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:activeFilter.color, display:'inline-block', boxShadow:`0 0 6px ${activeFilter.color}`, flexShrink:0 }} />
              {activeFilter.label}
              {count > 0 && <span style={{ background:`${activeFilter.color}30`, color:activeFilter.color, border:`1px solid ${activeFilter.color}50`, borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:800 }}>{count}</span>}
              <span style={{ color:'rgba(34,211,238,0.6)', fontSize:10, marginLeft:2 }}>{filterOpen ? '▲' : '▼'}</span>
            </button>
            {filterOpen && (
              <div style={{ position:'absolute', top:38, left:0, background:'rgba(8,12,24,0.96)', backdropFilter:'blur(16px)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', padding:'6px', minWidth:180, zIndex:20 }}>
                {[{ key:'ACTIVE', label:'Active', color:'#ef4444' }, { key:'MONITORING', label:'Monitoring', color:'#f59e0b' }, { key:'RESOLVED', label:'Resolved', color:'#22c55e' }, { key:'ARCHIVED', label:'Archived', color:'#cbd5e1' }, { key:'ALL', label:'All disasters', color:'#22d3ee' }].map(({ key, label, color }) => {
                  const cnt = key === 'ALL' ? reports.length : reports.filter(r => r.disasterStatus === key).length;
                  const active = statusFilter === key;
                  return (
                    <button key={key} onClick={() => { setStatusFilter(key as StatusFilter); setFilterOpen(false); }} style={btnStyle({ width:'100%', padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background: active ? `${color}18` : 'transparent', display:'flex', alignItems:'center', gap:10 })} onMouseOver={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }} onMouseOut={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0, boxShadow: active ? `0 0 8px ${color}` : 'none' }} />
                      <span style={{ flex:1, fontSize:12, fontWeight: active ? 700 : 500, color: active ? '#f1f5f9' : '#94a3b8', textAlign:'left', letterSpacing:'0.03em' }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color: active ? color : '#475569', background: active ? `${color}20` : 'rgba(255,255,255,0.05)', borderRadius:20, padding:'1px 7px' }}>{cnt}</span>
                      {active && <span style={{ color, fontSize:10 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── MAP CONTROLS — hidden in reroute mode ── */}
      {!rerouteMode && (() => {
        const styleMeta: Record<MapStyle, {icon:string;label:string}> = { streets: { icon:'☀️', label:'Light' }, dark: { icon:'🌙', label:'Dark' }, satellite: { icon:'🛰️', label:'Satellite' } };
        const cur = styleMeta[styleMode];
        return (
          <div style={{ position:'absolute', top:12, left:198, zIndex:10 }}>
            <button onClick={() => { setMapCtrlOpen(o => !o); setFilterOpen(false); }} style={btnStyle({ height:34, padding:'0 12px', borderRadius:10, border:`1px solid ${mapCtrlOpen ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.2)'}`, background:'rgba(10,15,30,0.88)', backdropFilter:'blur(12px)', color:'#f1f5f9', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:7, letterSpacing:'0.04em', boxShadow: mapCtrlOpen ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 10px rgba(0,0,0,0.4)', transition:'all 0.15s' })}>
              <span style={{ fontSize:14 }}>{cur.icon}</span>
              <span>{cur.label}</span>
              {is3D && <span style={{ background:'rgba(34,211,238,0.15)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.3)', borderRadius:6, padding:'1px 6px', fontSize:9, fontWeight:800 }}>3D</span>}
              <span style={{ color:'rgba(34,211,238,0.6)', fontSize:10 }}>{mapCtrlOpen ? '▲' : '▼'}</span>
            </button>
            {mapCtrlOpen && (
              <div style={{ position:'absolute', top:38, left:0, background:'rgba(8,12,24,0.96)', backdropFilter:'blur(16px)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', padding:'6px', minWidth:170, zIndex:20 }}>
                <div style={{ fontSize:9, color:'rgba(34,211,238,0.75)', fontFamily:"'Courier New',monospace", letterSpacing:'0.1em', padding:'4px 10px 6px', textTransform:'uppercase' }}>Map Style</div>
                {([{ mode:'streets', icon:'☀️', label:'Light' }, { mode:'dark', icon:'🌙', label:'Dark' }, { mode:'satellite', icon:'🛰️', label:'Satellite' }] as {mode:MapStyle;icon:string;label:string}[]).map(({ mode, icon, label }) => {
                  const active = styleMode === mode;
                  return (
                    <button key={mode} onClick={() => setStyleMode(mode)} style={btnStyle({ width:'100%', padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background: active ? 'rgba(34,211,238,0.12)' : 'transparent', display:'flex', alignItems:'center', gap:10 })} onMouseOver={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }} onMouseOut={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                      <span style={{ fontSize:15 }}>{icon}</span>
                      <span style={{ flex:1, fontSize:12, fontWeight: active ? 700 : 500, color: active ? '#22d3ee' : '#94a3b8', textAlign:'left' }}>{label}</span>
                      {active && <span style={{ color:'#22d3ee', fontSize:10 }}>✓</span>}
                    </button>
                  );
                })}
                <div style={{ height:1, background:'rgba(34,211,238,0.1)', margin:'6px 6px' }} />
                <div style={{ fontSize:9, color:'rgba(34,211,238,0.75)', fontFamily:"'Courier New',monospace", letterSpacing:'0.1em', padding:'4px 10px 6px', textTransform:'uppercase' }}>View</div>
                <button onClick={() => { toggle3D(); setMapCtrlOpen(false); }} style={btnStyle({ width:'100%', padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background: is3D ? 'rgba(34,211,238,0.12)' : 'transparent', display:'flex', alignItems:'center', gap:10 })}>
                  <span style={{ fontSize:15 }}>🏙️</span>
                  <span style={{ flex:1, fontSize:12, fontWeight: is3D ? 700 : 500, color: is3D ? '#22d3ee' : '#94a3b8', textAlign:'left' }}>3D Buildings</span>
                  {is3D && <span style={{ color:'#22d3ee', fontSize:10 }}>✓</span>}
                </button>
                <button onClick={() => { resetView(); setMapCtrlOpen(false); }} style={btnStyle({ width:'100%', padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background:'transparent', display:'flex', alignItems:'center', gap:10 })} onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }} onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  <span style={{ fontSize:15 }}>⌖</span>
                  <span style={{ flex:1, fontSize:12, fontWeight:500, color:'#94a3b8', textAlign:'left' }}>Reset View</span>
                </button>
                <div style={{ height:1, background:'rgba(34,211,238,0.1)', margin:'6px 6px' }} />
                <button onClick={() => { setShowStations(s => !s); setMapCtrlOpen(false); }} style={btnStyle({ width:'100%', padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background: showStations ? 'rgba(34,211,238,0.12)' : 'transparent', display:'flex', alignItems:'center', gap:10 })}>
                  <span style={{ fontSize:15 }}>🏛️</span>
                  <span style={{ flex:1, fontSize:12, fontWeight: showStations ? 700 : 500, color: showStations ? '#22d3ee' : '#94a3b8', textAlign:'left' }}>Stations</span>
                  {showStations && <span style={{ color:'#22d3ee', fontSize:10 }}>✓</span>}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {(filterOpen || mapCtrlOpen) && (
        <div style={{ position:'absolute', inset:0, zIndex:9 }} onClick={() => { setFilterOpen(false); setMapCtrlOpen(false); }} />
      )}

      {/* ── SEVERITY LEGEND — hidden in reroute mode ── */}
      {!rerouteMode && (
        <div style={{ position:'absolute', bottom:36, right:14, zIndex:5, background:'rgba(10,15,30,0.82)', backdropFilter:'blur(10px)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(34,211,238,0.15)', boxShadow:'0 0 24px rgba(34,211,238,0.05), 0 4px 16px rgba(0,0,0,0.3)', minWidth:110 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8, fontFamily:"'Courier New',monospace" }}>◈ SEVERITY</div>
          {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
            <div key={sev} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 6px ${color}` }} />
              <span style={{ fontSize:11, color:'#cbd5e1', fontWeight:500, fontFamily:"'Courier New',monospace" }}>{sev.charAt(0)+sev.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {mapReady && visibleReports.length === 0 && !rerouteMode && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:4 }}>
          <div style={{ background:'rgba(10,15,30,0.88)', backdropFilter:'blur(10px)', borderRadius:14, padding:'22px 32px', textAlign:'center', border:'1px solid rgba(34,211,238,0.18)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🗺️</div>
            <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, fontFamily:"'Courier New',monospace", letterSpacing:'0.04em' }}>NO INCIDENTS TO DISPLAY</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Adjust filter above</div>
          </div>
        </div>
      )}

      {/* ── DISASTER DRAWER ── */}
      {drawerReport && !drawerUnit && !rerouteMode && (() => {
        const r = drawerReport;
        const sevColor  = SEVERITY_COLOR[r.severity.toUpperCase()] ?? '#9ca3af';
        const statColor = STATUS_COLOR[r.disasterStatus] ?? '#9ca3af';
        const emoji     = TYPE_EMOJI[r.type.toUpperCase()] ?? '⚠️';
        const isResolved = r.disasterStatus === 'RESOLVED' || r.disasterStatus === 'ARCHIVED';
        const act = (action: () => void) => { setDrawerReport(null); action(); };
        const plan = reroutePlans.find(p => p.disaster_id === r.id);
        return (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, background:'rgba(10,15,30,0.92)', borderRadius:'16px 16px 0 0', boxShadow:'0 -4px 30px rgba(0,0,0,0.6), 0 -1px 0 rgba(34,211,238,0.18)', padding:'0 16px 16px', backdropFilter:'blur(16px)', animation:'drawerSlideUp 0.22s ease-out', border:'1px solid rgba(34,211,238,0.12)', borderBottom:'none' }}>
            <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:14, position:'relative' }}>
              <div style={{ width:36, height:3, borderRadius:3, background:'rgba(34,211,238,0.25)' }} />
              <button onClick={() => setDrawerReport(null)} style={{ position:'absolute', right:0, top:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:11, color:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            {isMobile ? (
              /* Mobile: two clean rows */
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:`${sevColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:21, flexShrink:0, boxShadow:`0 0 14px ${sevColor}40`, border:`1px solid ${sevColor}30` }}>{emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#f1f5f9', letterSpacing:'0.05em', fontFamily:"'Courier New',monospace" }}>{r.type.toUpperCase()}</div>
                    <div style={{ fontSize:10, color:'#64748b', fontFamily:"'Courier New',monospace", marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.reportId}</div>
                  </div>
                  <span style={{ padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:'0.4px', background:`${sevColor}22`, color:sevColor, border:`1.5px solid ${sevColor}50`, flexShrink:0, boxShadow:`0 0 8px ${sevColor}40` }}>{r.severity.toUpperCase()}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap', fontFamily:"'Courier New',monospace" }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${statColor}15`, border:`1px solid ${statColor}40`, borderRadius:20, padding:'3px 9px' }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:statColor, display:'inline-block', boxShadow:`0 0 6px ${statColor}`, flexShrink:0 }} />
                    <span style={{ fontSize:10, fontWeight:600, color:statColor }}>{STATUS_LABEL[r.disasterStatus] ?? r.disasterStatus}</span>
                  </span>
                  <span style={{ fontSize:10, color:'#94a3b8' }}>👥 {r.units} units</span>
                  <span style={{ fontSize:10, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:'1 1 0', minWidth:0 }}>📍 {r.location || 'Unknown'}</span>
                </div>
              </>
            ) : (
              /* Desktop: original single-row layout */
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${sevColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, boxShadow:`0 0 12px ${sevColor}40` }}>{emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#f1f5f9', letterSpacing:'0.05em', fontFamily:"'Courier New',monospace" }}>{r.type.toUpperCase()}</div>
                  <div style={{ fontSize:11, color:'#cbd5e1', marginTop:1, display:'flex', alignItems:'center', gap:6, fontFamily:"'Courier New',monospace" }}>
                    <span>{r.reportId}</span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'#475569', display:'inline-block' }} />
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><span style={{ width:6, height:6, borderRadius:'50%', background:statColor, display:'inline-block', boxShadow:`0 0 6px ${statColor}` }} />{STATUS_LABEL[r.disasterStatus] ?? r.disasterStatus}</span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'#475569', display:'inline-block' }} />
                    <span>👥 {r.units}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#cbd5e1', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:"'Courier New',monospace" }}>📍 {r.location || 'Unknown'}</div>
                </div>
                <span style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:'0.4px', background:`${sevColor}22`, color:sevColor, border:`1.5px solid ${sevColor}50`, flexShrink:0, boxShadow:`0 0 8px ${sevColor}40` }}>{r.severity.toUpperCase()}</span>
              </div>
            )}

            {/* Blocked roads notice */}
            {plan && plan.blocked_roads.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:8, fontFamily:"'Courier New',monospace" }}>
                <span style={{ fontSize:12 }}>🚧</span>
                <span style={{ fontSize:10, color:'#fca5a5', fontWeight:600 }}>
                  {plan.blocked_roads.map(b => b.road_name).filter(n => n !== 'Unknown Road').join(', ') || `${plan.blocked_roads.length} road${plan.blocked_roads.length > 1 ? 's' : ''}`} blocked near this disaster
                </span>
              </div>
            )}

            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <button onClick={() => act(() => onViewPhotos(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer' })}>🖼️ Photos</button>
              <button onClick={() => act(() => onViewLogs(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer' })}>📋 Logs</button>
              {r.deployedUnits?.length > 0 && (
                <button onClick={() => act(() => onViewDeployedUnits(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer' })}>🚨 Units</button>
              )}
              {evacuationPlanMap[r.id] && onViewEvacuationPlan && (
                <button onClick={() => act(() => onViewEvacuationPlan(r, evacuationPlanMap[r.id]))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer' })}>🚶 Evacuation</button>
              )}
              <button disabled={isResolved} onClick={() => !isResolved && act(() => onDispatch(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border: isResolved ? '1px solid rgba(124,58,237,0.25)' : 'none', background: isResolved ? 'rgba(124,58,237,0.08)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: isResolved ? 'rgba(167,139,250,0.4)' : 'white', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer', boxShadow: isResolved ? 'none' : '0 2px 8px #7c3aed50' })}>🚨 Dispatch</button>
              <button disabled={isResolved} onClick={() => !isResolved && act(() => onEscalate(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border: isResolved ? '1px solid rgba(239,68,68,0.25)' : 'none', background: isResolved ? 'rgba(239,68,68,0.08)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: isResolved ? 'rgba(252,165,165,0.4)' : 'white', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer', boxShadow: isResolved ? 'none' : '0 2px 8px #ef444450' })}>⚡ Escalate</button>
              <button disabled={isResolved} onClick={() => !isResolved && act(() => onResolve(r))} style={btnStyle({ flex:'1 1 70px', minWidth:60, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 6px', borderRadius:8, border: isResolved ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.4)', background: isResolved ? 'rgba(34,197,94,0.06)' : 'rgba(22,101,52,0.3)', color: isResolved ? 'rgba(74,222,128,0.35)' : '#4ade80', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer' })}>✓ Resolve</button>
              {plan && (
                <button onClick={() => enterRerouteMode(r)} style={btnStyle({ flex:'1 1 100px', minWidth:90, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 6px', borderRadius:8, border:'1px solid rgba(34,211,238,0.4)', background:'rgba(34,211,238,0.12)', color:'#22d3ee', fontSize:11, fontWeight:700, cursor:'pointer', boxShadow:'0 0 12px rgba(34,211,238,0.15)' })}>🛣️ Show Reroutes</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── STATION DRAWER ── */}
      {drawerUnit && !rerouteMode && (() => {
        const u = drawerUnit;
        const deptColor = DEPT_COLOR[u.department] ?? '#6b7280';
        const deptIcon  = DEPT_ICON[u.department] ?? '🏢';
        const statColor = UNIT_STATUS_COLOR[u.unit_status] ?? '#9ca3af';
        const crewPct   = Math.round((u.crew_count / (u.capacity || 1)) * 100);
        return (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, background:'rgba(10,15,30,0.92)', borderRadius:'16px 16px 0 0', boxShadow:'0 -4px 30px rgba(0,0,0,0.6), 0 -1px 0 rgba(34,211,238,0.18)', padding:'0 16px 18px', backdropFilter:'blur(16px)', animation:'drawerSlideUp 0.22s ease-out', border:'1px solid rgba(34,211,238,0.12)', borderBottom:'none' }}>
            <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:14, position:'relative' }}>
              <div style={{ width:36, height:3, borderRadius:3, background:`${deptColor}60` }} />
              <button onClick={() => setDrawerUnit(null)} style={{ position:'absolute', right:0, top:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:11, color:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${deptColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, boxShadow:`0 0 14px ${deptColor}40`, border:`1px solid ${deptColor}30` }}>{deptIcon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'#f1f5f9', letterSpacing:'0.05em', fontFamily:"'Courier New',monospace", marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.unit_name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800, background:`${deptColor}22`, color:deptColor, border:`1px solid ${deptColor}40` }}>{u.department}</span>
                  <span style={{ padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800, background:`${statColor}18`, color:statColor, border:`1.5px solid ${statColor}50` }}>{u.unit_status}</span>
                </div>
                <div style={{ fontSize:11, color:'#cbd5e1', fontFamily:"'Courier New',monospace" }}>{u.unit_code} · {u.unit_type.replace(/_/g,' ')}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(34,211,238,0.1)', borderRadius:10, padding:'10px 12px', gridColumn:'1 / -1' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(34,211,238,0.75)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, fontFamily:"'Courier New',monospace" }}>📍 Station</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', fontFamily:"'Courier New',monospace", marginBottom:2 }}>{u.station?.name || u.station_name}</div>
                <div style={{ fontSize:11, color:'#94a3b8', fontFamily:"'Courier New',monospace" }}>{u.station?.address || u.station_address}</div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(34,211,238,0.1)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(34,211,238,0.75)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, fontFamily:"'Courier New',monospace" }}>👑 Commander</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', fontFamily:"'Courier New',monospace" }}>{u.commander?.name || u.commander_name}</div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(34,211,238,0.1)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(34,211,238,0.75)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, fontFamily:"'Courier New',monospace" }}>👥 Crew</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', fontFamily:"'Courier New',monospace", marginBottom:5 }}>{u.crew_count} / {u.capacity}</div>
                <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${crewPct}%`, background:deptColor, borderRadius:4, boxShadow:`0 0 6px ${deptColor}` }} />
                </div>
              </div>
            </div>
            {u.current_assignment && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#ef4444', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4, fontFamily:"'Courier New',monospace" }}>🚨 Currently Deployed</div>
                <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', fontFamily:"'Courier New',monospace", marginBottom:2 }}>{u.current_assignment.disaster_tracking_id} · {u.current_assignment.disaster_type}</div>
                <div style={{ fontSize:11, color:'#94a3b8', fontFamily:"'Courier New',monospace" }}>📍 {u.current_assignment.location}</div>
              </div>
            )}
            {u.vehicle && <div style={{ fontSize:11, color:'#cbd5e1', fontFamily:"'Courier New',monospace", textAlign:'center', marginBottom:12 }}>🚗 {u.vehicle.model} · {u.vehicle.year} · {u.vehicle.license_plate}</div>}
            {u.unit_status !== 'DEPLOYED' && (
              <button onClick={() => setDeployModalOpen(true)} style={btnStyle({ width:'100%', padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 3px 12px #7c3aed50' })}>
                🚀 Deploy Unit
              </button>
            )}
          </div>
        );
      })()}

      {drawerUnit && (
        <DeployUnitModal
          open={deployModalOpen}
          unitId={drawerUnit.unit_code}
          unitUuid={drawerUnit.id}
          unitType={drawerUnit.unit_type}
          station={drawerUnit.station?.name || drawerUnit.station_name}
          onClose={() => setDeployModalOpen(false)}
          onSuccess={() => {
            setDeployModalOpen(false);
            setDrawerUnit(null);
            apiClient.get(API_ENDPOINTS.TEAMS.LIST).then(res => {
              const list: EmergencyUnit[] = res.data.units ?? [];
              Promise.all(list.map(async u => {
                try { const d = await apiClient.get(API_ENDPOINTS.TEAMS.UNIT_BY_ID(u.id)); return { ...u, ...d.data } as EmergencyUnit; }
                catch { return u; }
              })).then(setUnits).catch(() => {});
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
};

export default MapView;