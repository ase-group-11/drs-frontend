import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Spin } from 'antd';
import type { DisasterReport } from '../../../types';

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

type StatusFilter = 'ALL' | 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ARCHIVED';
type MapStyle = 'streets' | 'dark' | 'satellite';

interface MapViewProps {
  reports: DisasterReport[];
  onDispatch:   (report: DisasterReport) => void;
  onEscalate:   (report: DisasterReport) => void;
  onResolve:    (report: DisasterReport) => void;
  onViewPhotos: (report: DisasterReport) => void;
  onViewLogs:   (report: DisasterReport) => void;
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

function createClusterHtml(count: number): string {
  const size = count < 5 ? 36 : count < 20 ? 44 : 52;
  const color = count < 5 ? '#f97316' : count < 20 ? '#ef4444' : '#7c3aed';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count<100?13:11}px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${count}</div>`;
}

// ─── Component ───────────────────────────────────────────────────────────────
const MapView: React.FC<MapViewProps> = ({
  reports, onDispatch, onEscalate, onResolve, onViewPhotos, onViewLogs,
}) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<mapboxgl.Map | null>(null);
  const markersRef    = useRef<mapboxgl.Marker[]>([]);
  const popupRef      = useRef<mapboxgl.Popup | null>(null);
  const boundsSetRef    = useRef(false);
  const styleMountedRef = useRef(false);

  const [mapReady,     setMapReady]     = useState(false);
  const [mapError,     setMapError]     = useState('');
  const [styleMode,    setStyleMode]    = useState<MapStyle>('dark');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [drawerReport, setDrawerReport] = useState<DisasterReport | null>(null);
  const [is3D,         setIs3D]         = useState(false);

  const isDark = styleMode === 'dark';

  const visibleReports = reports.filter(r =>
    statusFilter === 'ALL' ? true : r.disasterStatus === statusFilter
  );

  // ── Init map ──
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
      const initStyle = styleMode; // capture at load time
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
      markersRef.current = [];
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style toggle ──
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    // Skip on initial mount — map already loaded with correct style
    if (!styleMountedRef.current) { styleMountedRef.current = true; return; }
    const m = mapRef.current;
    const center = m.getCenter(), zoom = m.getZoom(), pitch = m.getPitch(), bearing = m.getBearing();
    const urls: Record<MapStyle, string> = { streets: 'mapbox://styles/mapbox/streets-v12', dark: 'mapbox://styles/mapbox/dark-v11', satellite: 'mapbox://styles/mapbox/satellite-streets-v12' };
    m.setStyle(urls[styleMode]);
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
    });
  }, [styleMode, mapReady]);

  // ── Render markers ──
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
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
        el.addEventListener('click', () => {
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
        el.addEventListener('click', () => setDrawerReport(report));
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([report.locationCoords.lon, report.locationCoords.lat]).addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });

    if (hasCoords && !bounds.isEmpty() && !boundsSetRef.current) {
      boundsSetRef.current = true;
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
    }
  }, [visibleReports, mapReady, reports, onDispatch, onEscalate, onResolve, onViewPhotos, onViewLogs]);

  useEffect(() => { boundsSetRef.current = false; }, [statusFilter]);
  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  const resetView = () => mapRef.current?.flyTo({ center: DUBLIN, zoom: DEFAULT_ZOOM, duration: 1000 });

  const toggle3D = () => {
    if (!mapRef.current) return;
    const next = !is3D;
    setIs3D(next);
    mapRef.current.easeTo({
      pitch: next ? 50 : 0,
      bearing: next ? -10 : 0,
      duration: 800,
    });
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

  return (
    <div style={{ position:'relative', borderRadius:14, overflow:'hidden', height:600, boxShadow: isDark ? '0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.12)' }}>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes drawerSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes scanline {
          0%{background-position:0 0}
          100%{background-position:0 100%}
        }
        .mapboxgl-popup-content { padding:12px 14px!important;border-radius:10px!important;box-shadow:0 4px 20px rgba(0,0,0,0.15)!important; }
        .mapboxgl-popup-close-button { font-size:16px!important;color:#9ca3af!important;padding:4px 8px!important; }
      `}</style>

      {/* Map */}
      <div ref={containerRef} style={{ width:'100%', height:'100%' }} />

      {/* Scanline overlay (dark mode only) */}
      {isDark && (
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
          background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)',
        }} />
      )}

      {/* Corner accent (dark mode) */}
      {isDark && <>
        <div style={{ position:'absolute', top:0, left:0, width:60, height:60, borderTop:'2px solid rgba(34,211,238,0.4)', borderLeft:'2px solid rgba(34,211,238,0.4)', borderRadius:'14px 0 0 0', zIndex:3, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, right:0, width:60, height:60, borderTop:'2px solid rgba(34,211,238,0.4)', borderRight:'2px solid rgba(34,211,238,0.4)', borderRadius:'0 14px 0 0', zIndex:3, pointerEvents:'none' }} />
      </>}

      {/* Loading */}
      {!mapReady && (
        <div style={{ position:'absolute', inset:0, background: isDark ? 'rgba(8,14,28,0.85)' : 'rgba(255,255,255,0.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <Spin size="large" />
          <div style={{ marginTop:12, color: isDark ? '#cbd5e1' : '#374151', fontWeight:500, fontSize:13, fontFamily:'monospace' }}>
            {isDark ? 'INITIALIZING EOC MAP...' : 'Loading map...'}
          </div>
        </div>
      )}

      {/* ── STATUS FILTER — top left ── */}
      <div style={{
        position:'absolute', top:14, left:14, zIndex:5,
        display:'flex', gap:2, alignItems:'center',
        background: 'rgba(10,15,30,0.82)',
        backdropFilter:'blur(10px)',
        borderRadius:10, padding:'0 4px',
        border: '1px solid rgba(34,211,238,0.18)',
        boxShadow: '0 0 24px rgba(34,211,238,0.06), 0 4px 16px rgba(0,0,0,0.3)',
        height: 34,
      }}>
        {([
          { key:'ACTIVE',     label:'Active',     color:'#ef4444' },
          { key:'MONITORING', label:'Monitoring', color:'#f59e0b' },
          { key:'RESOLVED',   label:'Resolved',   color:'#22c55e' },
          { key:'ARCHIVED',   label:'Archived',   color:'#cbd5e1' },
          { key:'ALL',        label:'All',         color:'#22d3ee' },
        ] as {key:StatusFilter;label:string;color:string}[]).map(({ key, label, color }) => {
          const active = statusFilter === key;
          const count = key === 'ALL' ? reports.length : reports.filter(r => r.disasterStatus === key).length;
          return (
            <button key={key} onClick={() => setStatusFilter(key)} style={{
              height:26, padding:'0 10px', borderRadius:7, border:'none', cursor:'pointer',
              fontSize:11, fontWeight: active ? 700 : 500,
              background: active ? color : 'transparent',
              color: active ? 'white' : '#cbd5e1',
              boxShadow: active ? `0 1px 8px ${color}70` : 'none',
              transition:'all 0.15s', whiteSpace:'nowrap',
              fontFamily:"'Courier New', monospace",
              letterSpacing:'0.04em',
              display:'flex', alignItems:'center', gap:0,
            }}>
              {label}
              {count > 0 && <span style={{ marginLeft:4, fontSize:10, fontWeight:700, background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', borderRadius:20, padding:'1px 5px' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── STYLE + RESET — top right ── */}
      <div style={{ position:'absolute', top:14, right:56, zIndex:5, display:'flex', gap:4 }}>
        {([
          { mode:'streets',   icon:'☀️', label:'Light'     },
          { mode:'dark',      icon:'🌙', label:'Dark'      },
          { mode:'satellite', icon:'🛰️', label:'Satellite' },
        ] as {mode:MapStyle;icon:string;label:string}[]).map(({ mode, icon, label }) => {
          const active = styleMode === mode;
          return (
            <button key={mode} onClick={() => setStyleMode(mode)} style={{
              height:34, padding:'0 11px', borderRadius:8,
              border: active ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(34,211,238,0.12)',
              cursor:'pointer', fontSize:11, fontWeight: active ? 700 : 500,
              background: active
                ? (mode === 'streets' ? 'rgba(255,255,255,0.92)' : 'rgba(34,211,238,0.15)')
                : 'rgba(10,15,30,0.82)',
              backdropFilter:'blur(10px)',
              color: active
                ? (mode === 'streets' ? '#111827' : '#22d3ee')
                : '#cbd5e1',
              boxShadow: active ? '0 0 14px rgba(34,211,238,0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
              display:'flex', alignItems:'center', gap:4, transition:'all 0.15s',
              fontFamily:"'Courier New',monospace", letterSpacing:'0.04em',
            }}>
              <span style={{ fontSize:12 }}>{icon}</span>{label}
            </button>
          );
        })}
        <button onClick={toggle3D} style={{
          height:34, padding:'0 11px', borderRadius:8,
          border: is3D ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(34,211,238,0.12)',
          cursor:'pointer', fontSize:11, fontWeight: is3D ? 700 : 500,
          background: is3D ? 'rgba(34,211,238,0.15)' : 'rgba(10,15,30,0.82)',
          backdropFilter:'blur(10px)',
          color: is3D ? '#22d3ee' : '#cbd5e1',
          boxShadow: is3D ? '0 0 14px rgba(34,211,238,0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
          display:'flex', alignItems:'center', gap:4, transition:'all 0.15s',
          fontFamily:"'Courier New',monospace", letterSpacing:'0.04em',
        }}>
          <span style={{ fontSize:12 }}>🏙️</span>{is3D ? '3D On' : '3D Off'}
        </button>
        <button onClick={resetView} style={{
          height:34, padding:'0 11px', borderRadius:8,
          border:'1px solid rgba(34,211,238,0.12)',
          cursor:'pointer', fontSize:11, fontWeight:500, marginLeft:2,
          background:'rgba(10,15,30,0.82)', backdropFilter:'blur(10px)',
          color:'#cbd5e1',
          boxShadow:'0 2px 8px rgba(0,0,0,0.25)',
          display:'flex', alignItems:'center', gap:4,
          fontFamily:"'Courier New',monospace", letterSpacing:'0.04em',
        }}>
          <span>⌖</span> Reset
        </button>
      </div>

      {/* ── LEGEND — bottom right ── */}
      <div style={{
        position:'absolute', bottom:36, right:14, zIndex:5,
        background: 'rgba(10,15,30,0.82)',
        backdropFilter:'blur(10px)',
        borderRadius:10, padding:'10px 14px',
        border: '1px solid rgba(34,211,238,0.15)',
        boxShadow: '0 0 24px rgba(34,211,238,0.05), 0 4px 16px rgba(0,0,0,0.3)',
        minWidth:110,
      }}>
        <div style={{ fontSize:9, fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8, fontFamily:"'Courier New',monospace" }}>
          ◈ SEVERITY
        </div>
        {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
          <div key={sev} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, boxShadow:`0 0 6px ${color}` }} />
            <span style={{ fontSize:11, color:'#cbd5e1', fontWeight:500, fontFamily:"'Courier New',monospace" }}>
              {sev.charAt(0)+sev.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {/* ── EMPTY STATE ── */}
      {mapReady && visibleReports.length === 0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:4 }}>
          <div style={{ background:'rgba(10,15,30,0.88)', backdropFilter:'blur(10px)', borderRadius:14, padding:'22px 32px', textAlign:'center', border:'1px solid rgba(34,211,238,0.18)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🗺️</div>
            <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, fontFamily:"'Courier New',monospace", letterSpacing:'0.04em' }}>NO INCIDENTS TO DISPLAY</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Adjust filter above</div>
          </div>
        </div>
      )}

      {/* ── BOTTOM DRAWER ── */}
      {drawerReport && (() => {
        const r = drawerReport;
        const sevColor   = SEVERITY_COLOR[r.severity.toUpperCase()] ?? '#9ca3af';
        const statColor  = STATUS_COLOR[r.disasterStatus] ?? '#9ca3af';
        const emoji      = TYPE_EMOJI[r.type.toUpperCase()] ?? '⚠️';
        const isResolved = r.disasterStatus === 'RESOLVED' || r.disasterStatus === 'ARCHIVED';
        const act = (action: () => void) => { setDrawerReport(null); action(); };

        return (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:20,
            background:'rgba(10,15,30,0.92)',
            borderRadius:'16px 16px 0 0',
            boxShadow:'0 -4px 30px rgba(0,0,0,0.6), 0 -1px 0 rgba(34,211,238,0.18)',
            padding:'0 16px 16px', backdropFilter:'blur(16px)',
            animation:'drawerSlideUp 0.22s ease-out',
            border:'1px solid rgba(34,211,238,0.12)',
            borderBottom:'none',
          }}>
            {/* Handle + close */}
            <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:8, position:'relative' }}>
              <div style={{ width:36, height:3, borderRadius:3, background:'rgba(34,211,238,0.25)' }} />
              <button onClick={() => setDrawerReport(null)} style={{ position:'absolute', right:0, top:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:11, color:'#cbd5e1', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            {/* Info row */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${sevColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, boxShadow:`0 0 12px ${sevColor}40` }}>
                {emoji}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'#f1f5f9', letterSpacing:'0.05em', fontFamily:"'Courier New',monospace" }}>
                  {r.type.toUpperCase()}
                </div>
                <div style={{ fontSize:11, color:'#cbd5e1', marginTop:1, display:'flex', alignItems:'center', gap:6, fontFamily:"'Courier New',monospace" }}>
                  <span>{r.reportId}</span>
                  <span style={{ display:'inline-block', width:3, height:3, borderRadius:'50%', background:'#475569' }} />
                  <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:statColor, display:'inline-block', boxShadow:`0 0 6px ${statColor}` }} />
                    {STATUS_LABEL[r.disasterStatus] ?? r.disasterStatus}
                  </span>
                  <span style={{ display:'inline-block', width:3, height:3, borderRadius:'50%', background:'#475569' }} />
                  <span>👥 {r.units}</span>
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:"'Courier New',monospace" }}>📍 {r.location || 'Unknown'}</div>
              </div>
              <span style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:'0.4px', background:`${sevColor}22`, color:sevColor, border:`1.5px solid ${sevColor}50`, flexShrink:0, boxShadow:`0 0 8px ${sevColor}40` }}>
                {r.severity.toUpperCase()}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => act(() => onViewPhotos(r))} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"'Courier New',monospace" }}>🖼️ Photos</button>
              <button onClick={() => act(() => onViewLogs(r))}   style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:8, border:'1px solid rgba(34,211,238,0.15)', background:'rgba(255,255,255,0.06)', color:'#cbd5e1', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"'Courier New',monospace" }}>📋 Logs</button>
              <button
                disabled={isResolved}
                onClick={() => !isResolved && act(() => onDispatch(r))}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:8, border: isResolved ? '1px solid rgba(124,58,237,0.25)' : 'none', background: isResolved ? 'rgba(124,58,237,0.08)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: isResolved ? 'rgba(167,139,250,0.4)' : 'white', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer', boxShadow: isResolved ? 'none' : '0 2px 8px #7c3aed50', fontFamily:"'Courier New',monospace" }}>🚨 Dispatch</button>
              <button
                disabled={isResolved}
                onClick={() => !isResolved && act(() => onEscalate(r))}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:8, border: isResolved ? '1px solid rgba(239,68,68,0.25)' : 'none', background: isResolved ? 'rgba(239,68,68,0.08)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: isResolved ? 'rgba(252,165,165,0.4)' : 'white', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer', boxShadow: isResolved ? 'none' : '0 2px 8px #ef444450', fontFamily:"'Courier New',monospace" }}>⚡ Escalate</button>
              <button
                disabled={isResolved}
                onClick={() => !isResolved && act(() => onResolve(r))}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:8, border: isResolved ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.4)', background: isResolved ? 'rgba(34,197,94,0.06)' : 'rgba(22,101,52,0.3)', color: isResolved ? 'rgba(74,222,128,0.35)' : '#4ade80', fontSize:11, fontWeight:700, cursor: isResolved ? 'not-allowed' : 'pointer', fontFamily:"'Courier New',monospace" }}>✓ Resolve</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MapView;