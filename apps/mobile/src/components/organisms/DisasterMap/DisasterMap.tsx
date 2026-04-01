// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/DisasterMap/DisasterMap.tsx
//
// TRAFFIC: Static coloured road lines + animated dots travelling along them
//   - Road paths drawn as LineLayer (full geometry from backend)
//   - A glowing dot per segment moves along the road using requestAnimationFrame
//   - Dot speed reflects congestion: severe = slow crawl, light = fast flow
//   - No Animated API used (avoids _listeners crash on RN 0.83)
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback,
} from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, ActivityIndicator,
  TextInput,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { colors } from '@theme/colors';
import type { Disaster } from '../../../types/disaster';
import Svg, { Path, Circle } from 'react-native-svg';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';
import Geolocation from '@react-native-community/geolocation';
import { mapService } from '@services/mapService';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

// ─── Types ────────────────────────────────────────────────────────────────

type CongestionLevel = 'light' | 'moderate' | 'heavy' | 'severe';

interface TrafficSegment {
  id:              string;
  coordinates:     [number, number][]; // [lon, lat] Mapbox order
  congestion_level: CongestionLevel;
  current_speed:   number | null;
  free_flow_speed: number | null;
  road_name:       string;
}

interface DisasterMapProps {
  disasters:       Disaster[];
  loading?:        boolean;
  onReport?:       () => void;
  selectedFilter?: string;
}

export interface DisasterMapRef {
  flyToDisaster: (disaster: Disaster) => void;
}

// ─── Reroute Types ───────────────────────────────────────────────────────

interface RoutePoint { lat: number; lon: number; }

interface RerouteEntry {
  route_id:             string;
  points:               [number, number][]; // [lon, lat] Mapbox order
  travel_time_seconds:  number;
  length_meters:        number;
}



// ─── Constants ────────────────────────────────────────────────────────────

const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  light:    '#22C55E',
  moderate: '#EAB308',
  heavy:    '#F97316',
  severe:   '#EF4444',
};

const CONGESTION_LABEL: Record<CongestionLevel, string> = {
  light: 'Light', moderate: 'Moderate', heavy: 'Heavy', severe: 'Severe',
};

// How fast the dot moves along the path (fraction of total length per ms)
// light = fastest, severe = slowest crawl
const CONGESTION_SPEED: Record<CongestionLevel, number> = {
  light:    0.00018,
  moderate: 0.00010,
  heavy:    0.000055,
  severe:   0.000025,
};

const CONGESTION_LEVELS: CongestionLevel[] = ['light', 'moderate', 'heavy', 'severe'];

const DISASTER_ICONS: Record<string, string> = {
  fire:       '🔥',
  flood:      '🌊',
  storm:      '⛈️',
  earthquake: '🏚️',
  hurricane:  '🌀',
  tornado:    '🌪️',
  tsunami:    '🌊',
  drought:    '☀️',
  heatwave:   '🌡️',
  coldwave:   '🥶',
  other:      '⚠️',
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6',
};

const getDisasterIcon  = (t: string) => DISASTER_ICONS[t?.toLowerCase()] || '⚠️';
const getSeverityColor = (s: string) => SEVERITY_COLORS[s?.toLowerCase()] || '#6B7280';

// ─── Geometry helpers ─────────────────────────────────────────────────────

// Euclidean distance between two [lon,lat] points (good enough for short segments)
const dist = (a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
};

// Total path length
const pathLength = (coords: [number, number][]) => {
  let len = 0;
  for (let i = 1; i < coords.length; i++) len += dist(coords[i - 1], coords[i]);
  return len;
};

// Interpolate a point at `t` (0→1) along the path
const interpolate = (
  coords: [number, number][],
  t: number,
): [number, number] => {
  const total   = pathLength(coords);
  let   target  = total * Math.max(0, Math.min(1, t));
  for (let i = 1; i < coords.length; i++) {
    const seg = dist(coords[i - 1], coords[i]);
    if (target <= seg) {
      const ratio = target / seg;
      return [
        coords[i - 1][0] + ratio * (coords[i][0] - coords[i - 1][0]),
        coords[i - 1][1] + ratio * (coords[i][1] - coords[i - 1][1]),
      ];
    }
    target -= seg;
  }
  return coords[coords.length - 1];
};

// ─── GeoJSON builders ─────────────────────────────────────────────────────

const buildLinesGeoJSON = (
  segments: TrafficSegment[],
  level: CongestionLevel,
): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: segments
    .filter(s => s.congestion_level === level && s.coordinates.length >= 2)
    .map(s => ({
      type: 'Feature' as const,
      id: s.id,
      geometry: { type: 'LineString' as const, coordinates: s.coordinates },
      properties: {
        congestion_level: s.congestion_level,
        current_speed:   s.current_speed,
        free_flow_speed: s.free_flow_speed,
        road_name:       s.road_name,
      },
    })),
});

const buildDotsGeoJSON = (
  positions: Record<string, [number, number]>,
  segments:  TrafficSegment[],
): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: segments.map(s => ({
    type: 'Feature' as const,
    id: `dot-${s.id}`,
    geometry: {
      type: 'Point' as const,
      coordinates: positions[s.id] ?? s.coordinates[0],
    },
    properties: {
      color: CONGESTION_COLOR[s.congestion_level],
    },
  })),
});

// ─── Parse backend response ───────────────────────────────────────────────

const parseTrafficSegments = (flow: any[]): TrafficSegment[] => {
  const segments: TrafficSegment[] = [];
  for (let i = 0; i < flow.length; i++) {
    const item      = flow[i];
    const rawCoords = item?.coordinates ?? [];
    if (rawCoords.length < 2) continue;

    const coords: [number, number][] = [];
    for (const pair of rawCoords) {
      const lat = Number(pair[0]); // backend: [lat, lon]
      const lon = Number(pair[1]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        coords.push([lon, lat]); // Mapbox: [lon, lat]
      }
    }
    if (coords.length < 2) continue;

    segments.push({
      id:               `seg-${i}`,
      coordinates:      coords,
      congestion_level: item.congestion_level ?? 'light',
      current_speed:    item.current_speed    ?? null,
      free_flow_speed:  item.free_flow_speed  ?? null,
      road_name:        item.road_name        ?? 'Unknown road',
    });
  }
  return segments;
};

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export const DisasterMap = forwardRef<DisasterMapRef, DisasterMapProps>(({
  disasters, loading, onReport, selectedFilter = 'all',
}, ref) => {

  const [mapStyle, setMapStyle]               = useState('light');
  const [is3D, setIs3D]                       = useState(true);
  const [zoom, setZoom]                       = useState(13);
  const [userLocation, setUserLocation]       = useState<[number, number]>([-6.2603, 53.3498]);
  const [mapLoaded, setMapLoaded]             = useState(false);
  const [trafficSegments, setTrafficSegments] = useState<TrafficSegment[]>([]);
  const [showTraffic, setShowTraffic]         = useState(true);
  const [trafficLoading, setTrafficLoading]   = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<TrafficSegment | null>(null);

  // Dot positions: segmentId → current [lon, lat]
  const [dotPositions, setDotPositions]       = useState<Record<string, [number, number]>>({});

  // ── Destination search + reroute state ────────────────────────────────
  const [searchText, setSearchText]           = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [destinationPin, setDestinationPin]   = useState<[number, number] | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('');
  const [routes, setRoutes]                   = useState<RerouteEntry[]>([]);
  const [routesLoading, setRoutesLoading]     = useState(false);
  const [showRoutes, setShowRoutes]           = useState(false);
  const [searchExpanded, setSearchExpanded]     = useState(false);
  const [activeField, setActiveField]           = useState<'origin' | 'dest'>('dest');
  const [originText, setOriginText]             = useState('My Location');
  const [originPin, setOriginPin]               = useState<[number, number] | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [originLoading, setOriginLoading]       = useState(false);
  const originDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Animation progress: segmentId → t (0→1, loops)
  const progressRef  = useRef<Record<string, number>>({});
  const segmentsRef  = useRef<TrafficSegment[]>([]);
  const rafRef       = useRef<number | null>(null);
  const lastTimeRef  = useRef<number | null>(null);
  const cameraRef    = useRef<MapboxGL.Camera>(null);

  // ── Location ─────────────────────────────────────────────────────────
  useEffect(() => {
    Geolocation.getCurrentPosition(
      ({ coords: { longitude, latitude } }) => setUserLocation([longitude, latitude]),
      (err) => console.log('Location error:', err),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // ── Traffic fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchTraffic();
    const id = setInterval(fetchTraffic, 30000);
    return () => clearInterval(id);
  }, []);

  const fetchTraffic = async () => {
    setTrafficLoading(true);
    try {
      // Split Dublin into 4 quadrants — each gets a 5x5 TomTom grid
      // Total: ~100 sample points spread evenly across the city
      const quadrants = [
        '53.33,-6.45,53.45,-6.25', // NW: Fingal, Blanchardstown, Airport
        '53.33,-6.25,53.45,-6.05', // NE: Swords, Malahide, Clontarf
        '53.20,-6.45,53.33,-6.25', // SW: Tallaght, Clondalkin, Rathfarnham
        '53.20,-6.25,53.33,-6.05', // SE: City centre, Dun Laoghaire, Sandyford
      ];

      const results = await Promise.allSettled(
        quadrants.map(b => mapService.getTraffic(b) as Promise<any>)
      );

      const allSegs: TrafficSegment[] = [];
      const seenCoords = new Set<string>();

      results.forEach((result, qi) => {
        if (result.status !== 'fulfilled') return;
        const raw = result.value;
        if (!raw?.available || !Array.isArray(raw?.traffic?.flow)) return;

        const segs = parseTrafficSegments(raw.traffic.flow).map((s, si) => ({
          ...s,
          id: `q${qi}-seg-${si}`,
        }));

        segs.forEach(s => {
          // Deduplicate by first coordinate
          const key = s.coordinates[0]?.join(',') ?? '';
          if (key && !seenCoords.has(key)) {
            seenCoords.add(key);
            allSegs.push(s);
          }
        });
      });

      console.log(`Traffic: ${allSegs.length} road segments across Dublin`);

      const prog: Record<string, number> = { ...progressRef.current };
      allSegs.forEach(s => {
        if (prog[s.id] === undefined) {
          prog[s.id] = Math.random(); // stagger start positions
        }
      });
      progressRef.current = prog;
      segmentsRef.current = allSegs;
      setTrafficSegments(allSegs);

    } catch (e) {
      console.warn('Traffic fetch error:', e);
      segmentsRef.current = [];
      setTrafficSegments([]);
    } finally {
      setTrafficLoading(false);
    }
  };

  // ── Animation loop (requestAnimationFrame, no Animated API) ──────────
  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const segs = segmentsRef.current;
    if (segs.length === 0) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const prog     = progressRef.current;
    const newPositions: Record<string, [number, number]> = {};
    let changed = false;

    for (const seg of segs) {
      const speed = CONGESTION_SPEED[seg.congestion_level];
      let t = (prog[seg.id] ?? 0) + speed * delta;
      if (t > 1) t = t - 1; // loop back to start
      prog[seg.id] = t;

      const pos = interpolate(seg.coordinates, t);
      newPositions[seg.id] = pos;
      changed = true;
    }

    if (changed) {
      setDotPositions({ ...newPositions });
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Start / stop animation based on showTraffic + mapLoaded
  useEffect(() => {
    if (showTraffic && mapLoaded) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [showTraffic, mapLoaded, animate]);

  // ── Disasters ─────────────────────────────────────────────────────────
  const validDisasters = disasters.filter(d => {
    const lat = Number(d.location?.latitude);
    const lng = Number(d.location?.longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;
    if (selectedFilter === 'all') return true;
    return (d.type ?? '').toLowerCase() === selectedFilter.toLowerCase();
  });

  useImperativeHandle(ref, () => ({
    flyToDisaster: (disaster: Disaster) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [
          Number(disaster.location.longitude),
          Number(disaster.location.latitude),
        ],
        zoomLevel: 16, pitch: is3D ? 60 : 0, animationDuration: 1500,
      });
    },
  }));

  const handleMarkerPress = (disaster: Disaster) => {
    setSelectedSegment(null);
    cameraRef.current?.setCamera({
      centerCoordinate: [
        Number(disaster.location.longitude),
        Number(disaster.location.latitude),
      ],
      zoomLevel: 17, pitch: is3D ? 60 : 0, animationDuration: 1000,
    });
  };

  // ── Destination search + reroute handlers ──────────────────────────

  // ── Geocoding helper ────────────────────────────────────────────────
  const geocodeQuery = async (text: string): Promise<any[]> => {
    try {
      const q = encodeURIComponent(text);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`
        + `?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
        + `&limit=5&country=IE&proximity=-6.2603,53.3498&types=poi,address,place,locality`;
      const res = await fetch(url);
      const data = await res.json();
      return data?.features ?? [];
    } catch { return []; }
  };

  // ── Mapbox direct route (no disaster) ───────────────────────────────
  const fetchDirectRoute = async (
    origLon: number, origLat: number,
    destLon: number, destLat: number,
  ): Promise<RerouteEntry | null> => {
    try {
      // driving-traffic uses live traffic for optimised routing
      // continue_straight=true avoids u-turns at origin snap point
      // steps=false keeps geometry clean with no instruction waypoints
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic`
        + `/${origLon},${origLat};${destLon},${destLat}`
        + `?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
        + `&geometries=geojson`
        + `&overview=full`
        + `&steps=false`
        + `&continue_straight=true`
        + `&exclude=ferry`;
      const res  = await fetch(url);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) return null;
      const coords: [number, number][] = route.geometry.coordinates; // already [lon,lat]
      return {
        route_id:            'direct',
        travel_time_seconds: Math.round(route.duration),
        length_meters:       Math.round(route.distance),
        points:              coords,
      };
    } catch { return null; }
  };

  // ── Origin field search ──────────────────────────────────────────────
  const handleOriginChange = (text: string) => {
    setOriginText(text);
    setOriginPin(null);
    if (originDebounce.current) clearTimeout(originDebounce.current);
    if (text.trim().length < 3) { setOriginSuggestions([]); return; }
    originDebounce.current = setTimeout(async () => {
      setOriginLoading(true);
      const results = await geocodeQuery(text);
      setOriginSuggestions(results);
      setOriginLoading(false);
    }, 400);
  };

  const handleSelectOrigin = (feature: any) => {
    const [lon, lat] = feature.center;
    setOriginPin([lon, lat]);
    setOriginText(feature.place_name.split(',')[0]);
    setOriginSuggestions([]);
    setActiveField('dest');
  };

  // ── Destination field search ─────────────────────────────────────────
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (text.trim().length < 3) { setSearchSuggestions([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await geocodeQuery(text);
      setSearchSuggestions(results);
      setSearchLoading(false);
    }, 400);
  };

  const handleSelectDestination = async (feature: any) => {
    const [destLon, destLat] = feature.center;
    setDestinationPin([destLon, destLat]);
    setDestinationLabel(feature.place_name);
    setSearchText(feature.place_name.split(',')[0]);
    setSearchSuggestions([]);
    setSearchExpanded(false);
    await loadRoutes(destLat, destLon);
  };

  // ── Main route loader ────────────────────────────────────────────────
  const loadRoutes = async (destLat: number, destLon: number) => {
    setRoutesLoading(true);
    setShowRoutes(false);
    setRoutes([]);

    // Resolve origin coordinates
    const origLon = originPin ? originPin[0] : userLocation[0];
    const origLat = originPin ? originPin[1] : userLocation[1];

    try {
      // Find disaster that lies ON the route (within ~5km of route midpoint)
      const midLat = (origLat + destLat) / 2;
      const midLon = (origLon + destLon) / 2;

      const disasterOnRoute = disasters?.find(d => {
        const dLat = d.location?.latitude  ?? 0;
        const dLon = d.location?.longitude ?? 0;
        const dist = Math.sqrt((dLat - midLat) ** 2 + (dLon - midLon) ** 2);
        return dist < 0.08; // ~8km radius around midpoint
      });

      if (disasterOnRoute) {
        // Try reroute API for this disaster
        try {
          const plan = await mapService.getReroutePlan(disasterOnRoute.id) as any;
          const rawRoutes: any[] = plan?.chosen_routes ?? [];

          if (rawRoutes.length > 0) {
            const parsed: RerouteEntry[] = rawRoutes.map((r: any) => ({
              route_id:            r.route_id,
              travel_time_seconds: r.travel_time_seconds ?? 0,
              length_meters:       r.length_meters ?? 0,
              points: (r.points ?? []).map(([lat, lon]: [number, number]) => [lon, lat] as [number, number]),
            }));
            setRoutes(parsed);
            setShowRoutes(true);
            fitCameraToRoutes(parsed);
            setRoutesLoading(false);
            return;
          }
        } catch (e: any) {
          // 404 = no active reroute plan yet — fall through to direct route
          console.log('No reroute plan, showing direct route');
        }
      }

      // No disaster on route OR no reroute plan — show direct route via Mapbox
      const direct = await fetchDirectRoute(origLon, origLat, destLon, destLat);
      if (direct) {
        setRoutes([direct]);
        setShowRoutes(true);
        fitCameraToRoutes([direct]);
      }
    } catch (e) {
      console.warn('Route load failed:', e);
    }
    setRoutesLoading(false);
  };

  const fitCameraToRoutes = (routeList: RerouteEntry[]) => {
    const allPts = routeList.flatMap(r => r.points);
    if (allPts.length === 0) return;
    const lons = allPts.map(p => p[0]);
    const lats = allPts.map(p => p[1]);
    cameraRef.current?.fitBounds(
      [Math.max(...lons), Math.max(...lats)],
      [Math.min(...lons), Math.min(...lats)],
      [80, 80, 220, 80], 800,
    );
  };

  const clearDestination = () => {
    setDestinationPin(null);
    setDestinationLabel('');
    setOriginPin(null);
    setRoutes([]);
    setShowRoutes(false);
    setSearchText('');
    setSearchSuggestions([]);
    setOriginText('My Location');
    setOriginSuggestions([]);
    setSearchExpanded(false);
  };

  // Build GeoJSON for a route's points
  const routeToGeoJSON = (points: [number, number][]) => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: points },
    }],
  });

  const handleCenterMap = () => {
    setSelectedSegment(null);
    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: 13, pitch: is3D ? 45 : 0, animationDuration: 1000,
    });
  };

  const handleZoomIn = () => {
    const z = Math.min(zoom + 1, 20); setZoom(z);
    cameraRef.current?.setCamera({ zoomLevel: z, animationDuration: 300 });
  };

  const handleZoomOut = () => {
    const z = Math.max(zoom - 1, 11); setZoom(z);
    cameraRef.current?.setCamera({ zoomLevel: z, animationDuration: 300 });
  };

  const handle3DToggle = () => {
    const next = !is3D; setIs3D(next);
    cameraRef.current?.setCamera({ pitch: next ? 60 : 0, animationDuration: 500 });
  };

  // Build GeoJSON for dots (all segments in one source)
  const dotsGeoJSON = buildDotsGeoJSON(dotPositions, trafficSegments);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={`mapbox://styles/mapbox/${mapStyle}-v11`}
        logoEnabled={false}
        attributionEnabled={false}
        pitchEnabled
        rotateEnabled
        onDidFinishLoadingMap={() => {
          setMapLoaded(true);
          setTrafficSegments(prev => [...prev]);
        }}
        onDidFinishLoadingStyle={() => {
          // Fires every time the style (re)loads — including after light/dark switch
          setMapLoaded(true);
          setTrafficSegments(prev => [...prev]);
        }}
        onPress={() => setSelectedSegment(null)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={userLocation}
          zoomLevel={13} pitch={45} heading={0} animationDuration={0}
        />
        <MapboxGL.UserLocation visible showsUserHeadingIndicator androidRenderMode="normal" />

        {/* ── 3D layers ── */}
        {mapLoaded && (
          <>
            <MapboxGL.FillExtrusionLayer
              id="building-extrusion" sourceID="composite" sourceLayerID="building"
              filter={['==', 'extrude', 'true']}
              style={{
                fillExtrusionColor: mapStyle === 'dark' ? '#334155' : '#cbd5e0',
                fillExtrusionHeight: ['get', 'height'],
                fillExtrusionBase: ['get', 'min_height'],
                fillExtrusionOpacity: 0.9,
              }}
            />
            <MapboxGL.FillLayer id="water-fill" sourceID="composite" sourceLayerID="water"
              style={{ fillColor: mapStyle === 'dark' ? '#1e40af' : '#60a5fa', fillOpacity: 0.6 }}
            />
            <MapboxGL.FillLayer id="park-fill" sourceID="composite" sourceLayerID="landuse"
              filter={['in', 'class', 'park', 'pitch', 'playground']}
              style={{ fillColor: mapStyle === 'dark' ? '#166534' : '#86efac', fillOpacity: 0.5 }}
            />
          </>
        )}

        {/* ── Traffic road lines (static, one source per level) ── */}
        {mapLoaded && showTraffic && CONGESTION_LEVELS.map(level => {
          const geojson = buildLinesGeoJSON(trafficSegments, level);
          if (geojson.features.length === 0) return null;
          return (
            <MapboxGL.ShapeSource
              key={`line-src-${level}`}
              id={`line-src-${level}`}
              shape={geojson}
              onPress={(e) => {
                const p = e.features?.[0]?.properties;
                if (!p) return;
                const seg = trafficSegments.find(s => s.congestion_level === p.congestion_level
                  && s.road_name === p.road_name);
                setSelectedSegment(seg ?? {
                  id: '', coordinates: [],
                  congestion_level: p.congestion_level,
                  current_speed:    p.current_speed,
                  free_flow_speed:  p.free_flow_speed,
                  road_name:        p.road_name,
                });
              }}
            >
              {/* Glow */}
              <MapboxGL.LineLayer
                id={`line-glow-${level}`}
                style={{
                  lineColor:   CONGESTION_COLOR[level],
                  lineWidth:   8,
                  lineOpacity: 0.2,
                  lineCap:    'round',
                  lineJoin:   'round',
                }}
              />
              {/* Solid line */}
              <MapboxGL.LineLayer
                id={`line-main-${level}`}
                style={{
                  lineColor:   CONGESTION_COLOR[level],
                  lineWidth:   3.5,
                  lineOpacity: 0.8,
                  lineCap:    'round',
                  lineJoin:   'round',
                }}
              />
            </MapboxGL.ShapeSource>
          );
        })}

        {/* ── Animated dots — single ShapeSource updated each frame ── */}
        {mapLoaded && showTraffic && trafficSegments.length > 0 && (
          <MapboxGL.ShapeSource
            id="traffic-dots"
            shape={dotsGeoJSON}
          >
            {/* Outer glow ring */}
            <MapboxGL.CircleLayer
              id="dot-glow"
              style={{
                circleRadius:      9,
                circleColor:       ['get', 'color'],
                circleOpacity:     0.3,
                circleBlur:        0.8,
              }}
            />
            {/* Inner solid dot */}
            <MapboxGL.CircleLayer
              id="dot-core"
              style={{
                circleRadius:       5,
                circleColor:        ['get', 'color'],
                circleOpacity:      1,
                circleStrokeWidth:  1.5,
                circleStrokeColor:  '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Reroute / route lines ── */}
        {showRoutes && routes.map((route, idx) => {
          const isDirect   = route.route_id === 'direct';
          const isBlocked  = !isDirect && idx === 0 && routes.length > 1;
          // Blocked original: red dashed  |  fastest detour: blue solid  |  alternative: green solid  |  direct: blue solid
          const lineColor  = isBlocked ? '#EF4444' : idx === 1 ? '#3B82F6' : isDirect ? '#3B82F6' : '#22C55E';
          const lineDash   = isBlocked ? [6, 5] : undefined;
          const lineWidth  = isBlocked ? 3 : 5;
          return (
            <MapboxGL.ShapeSource
              key={`route-src-${route.route_id}`}
              id={`route-src-${idx}`}
              shape={routeToGeoJSON(route.points)}
            >
              {/* White outline for contrast */}
              <MapboxGL.LineLayer
                id={`route-outline-${idx}`}
                style={{
                  lineColor: '#FFFFFF',
                  lineWidth: lineWidth + 3,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: isBlocked ? 0 : 0.6,
                }}
              />
              <MapboxGL.LineLayer
                id={`route-line-${idx}`}
                style={{
                  lineColor,
                  lineWidth,
                  lineCap: 'round',
                  lineJoin: 'round',
                  ...(lineDash ? { lineDasharray: lineDash } : {}),
                  lineOpacity: 0.95,
                }}
              />
            </MapboxGL.ShapeSource>
          );
        })}

        {/* ── Origin dot — small green circle ── */}
        {showRoutes && (
          <MapboxGL.MarkerView
            id="origin-pin"
            coordinate={originPin ?? userLocation}
          >
            <View style={styles.originDot}>
              <View style={styles.originDotInner} />
            </View>
          </MapboxGL.MarkerView>
        )}

        {/* ── Destination dot — small red circle ── */}
        {destinationPin && (
          <MapboxGL.MarkerView id="dest-pin" coordinate={destinationPin}>
            <View style={styles.destDot}>
              <View style={styles.destDotInner} />
            </View>
          </MapboxGL.MarkerView>
        )}


        {/* ── Disaster markers ── */}
        {validDisasters.map(d => (
          <MapboxGL.MarkerView
            key={d.id}
            id={`m-${d.id}`}
            coordinate={[Number(d.location.longitude), Number(d.location.latitude)]}
          >
            <TouchableOpacity
              style={[styles.marker, { borderColor: getSeverityColor(d.severity) }]}
              onPress={() => handleMarkerPress(d)}
              activeOpacity={0.7}
            >
              <Text style={styles.markerIcon}>{getDisasterIcon(d.type)}</Text>
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Traffic popup */}
      {selectedSegment && (
        <View style={styles.popup}>
          {/* Header row: badge + close button */}
          <View style={styles.popupHeader}>
            <View style={[styles.popupBadge, { backgroundColor: CONGESTION_COLOR[selectedSegment.congestion_level] }]}>
              <Text style={styles.popupBadgeText}>{CONGESTION_LABEL[selectedSegment.congestion_level]} Traffic</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSegment(null)} style={styles.popupClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.popupCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Road name */}
          <Text style={styles.popupRoad} numberOfLines={1}>{selectedSegment.road_name}</Text>
          {/* Speed info */}
          {selectedSegment.current_speed !== null && (
            <Text style={styles.popupSpeed}>
              🚗 {selectedSegment.current_speed} km/h
              {selectedSegment.free_flow_speed !== null
                ? `  ·  free flow: ${selectedSegment.free_flow_speed} km/h` : ''}
            </Text>
          )}
          {/* Tap outside hint */}
          <Text style={styles.popupHint}>Tap map to dismiss</Text>
        </View>
      )}

      {/* ── Search: collapsed icon OR expanded panel ── */}
      {!searchExpanded ? (
        /* Collapsed: small search button sitting left of right controls */
        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={() => setSearchExpanded(true)}
          activeOpacity={0.85}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={8} stroke="#1F2937" strokeWidth={2} />
            <Path d="M21 21l-4.35-4.35" stroke="#1F2937" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      ) : (
        /* Expanded: Google Maps-style panel — left:12, right stops before dark/2D buttons (right:68) */
        <View style={styles.searchPanel}>

          {/* Header row */}
          <View style={styles.searchPanelHeader}>
            <TouchableOpacity onPress={clearDestination} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1F2937" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <Text style={styles.searchPanelTitle}>Plan Route</Text>
          </View>

          {/* Dotted connector */}
          <View style={styles.routeConnector}>
            <View style={styles.connectorDotGreen} />
            <View style={styles.connectorLine} />
            <View style={styles.connectorDotRed} />
          </View>

          {/* Origin row */}
          <TouchableOpacity
            style={[styles.searchRow, activeField === 'origin' && styles.searchRowActive]}
            onPress={() => setActiveField('origin')}
            activeOpacity={1}
          >
            <TextInput
              style={styles.searchRowInput}
              value={originText}
              onChangeText={handleOriginChange}
              onFocus={() => setActiveField('origin')}
              placeholder="Your location"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
            />
            {originLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : originText.length > 0 && originText !== 'My Location'
              ? <TouchableOpacity onPress={() => { setOriginText('My Location'); setOriginPin(null); setOriginSuggestions([]); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 14, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              : null
            }
          </TouchableOpacity>

          <View style={styles.searchDivider} />

          {/* Destination row */}
          <TouchableOpacity
            style={[styles.searchRow, activeField === 'dest' && styles.searchRowActive]}
            onPress={() => setActiveField('dest')}
            activeOpacity={1}
          >
            <TextInput
              style={styles.searchRowInput}
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => setActiveField('dest')}
              placeholder="Where to?"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              autoFocus={activeField === 'dest'}
              returnKeyType="search"
            />
            {searchLoading
              ? <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
              : searchText.length > 0
              ? <TouchableOpacity onPress={() => { setSearchText(''); setSearchSuggestions([]); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ fontSize: 15, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              : null
            }
          </TouchableOpacity>

          {/* Origin suggestions */}
          {activeField === 'origin' && originSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {originSuggestions.map((s: any, i: number) => (
                <TouchableOpacity
                  key={s.id ?? i}
                  style={[styles.suggestionRow, i < originSuggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => handleSelectOrigin(s)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, marginTop: 1 }}>🟢</Text>
                  <Text style={styles.suggestionText} numberOfLines={2}>{s.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Destination suggestions */}
          {activeField === 'dest' && searchSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {searchSuggestions.map((s: any, i: number) => (
                <TouchableOpacity
                  key={s.id ?? i}
                  style={[styles.suggestionRow, i < searchSuggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => handleSelectDestination(s)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, marginTop: 1 }}>🔴</Text>
                  <Text style={styles.suggestionText} numberOfLines={2}>{s.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Route Info Card ── */}
      {showRoutes && routes.length > 0 && (
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeCardTitle}>🗺️  Routes to {destinationLabel.split(',')[0]}</Text>
            <TouchableOpacity onPress={clearDestination} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>
          {routes.map((r, idx) => {
            const mins = Math.round(r.travel_time_seconds / 60);
            const km   = (r.length_meters / 1000).toFixed(1);
            const isDirect   = r.route_id === 'direct';
            const isBlocked  = !isDirect && idx === 0 && routes.length > 1;
            const color = isDirect ? '#3B82F6'
              : isBlocked ? '#EF4444'
              : idx === 1 ? '#3B82F6' : '#22C55E';
            const label = isDirect   ? '🛣️  Direct route'
              : isBlocked ? '🚫 Original route (blocked)'
              : idx === 1 ? '✅ Fastest detour' : '🔄 Alternative route';
            return (
              <View key={r.route_id} style={[styles.routeRow, { borderLeftColor: color }]}>
                <View style={[styles.routeDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeLabel, { color }]}>{label}</Text>
                  <Text style={styles.routeMeta}>{mins} min  ·  {km} km</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Route loading spinner */}
      {routesLoading && (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>Finding routes...</Text>
        </View>
      )}

      {/* Legend */}
      {showTraffic && trafficSegments.length > 0 && (
        <View style={styles.legend}>
          {CONGESTION_LEVELS.map(level => (
            <View key={level} style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: CONGESTION_COLOR[level] }]} />
              <Text style={styles.legendText}>{CONGESTION_LABEL[level]}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Left controls */}
      <View style={styles.leftControls}>
        <TouchableOpacity style={styles.btn} onPress={handleCenterMap}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={8} stroke={colors.primary} strokeWidth={2} />
            <Circle cx={12} cy={12} r={3} fill={colors.primary} />
            <Path d="M12 2v4M12 18v4M22 12h-4M6 12H2" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleZoomIn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke="#1F2937" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleZoomOut}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12h14" stroke="#1F2937" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Right controls */}
      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.btn}
          onPress={() => { setMapLoaded(false); setMapStyle(p => p === 'light' ? 'dark' : 'light'); }}>
          <Text style={styles.emoji}>{mapStyle === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handle3DToggle}>
          <Text style={styles.btnText}>{is3D ? '2D' : '3D'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, showTraffic && styles.btnActive]}
          onPress={() => setShowTraffic(p => !p)}
        >
          {trafficLoading
            ? <ActivityIndicator size="small" color={showTraffic ? '#fff' : colors.primary} />
            : <Text style={styles.emoji}>🚦</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Report button */}
      {onReport && (
        <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
          <Text style={styles.reportText}>⚠️ Report Disaster</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },

  marker: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
  },
  markerIcon: { fontSize: 32, textAlign: 'center' },

  loadingOverlay: {
    position: 'absolute', top: '50%', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, borderRadius: 12,
  },

  popup: {
    position: 'absolute',
    bottom: 90,   // just above Report Disaster button
    left: 80,     // clears the zoom controls (48px btn + 16px margin + gap)
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  popupHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  popupBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  popupBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  popupRoad:        { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  popupSpeed:       { fontSize: 12, color: '#4B5563' },
  popupClose:       { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  popupCloseText:   { fontSize: 14, color: '#6B7280', fontWeight: '700', lineHeight: 16 },
  popupHint:        { fontSize: 10, color: '#9CA3AF', marginTop: 3 },

  legend: {
    position: 'absolute', top: 30, left: 16,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 10, padding: 10, gap: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendLine: { width: 24, height: 5, borderRadius: 3 },
  legendText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  leftControls:  { position: 'absolute', left: 16, bottom: 100, gap: 12 },
  rightControls: { position: 'absolute', top: 16, right: 16, gap: 10 },
  btn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  btnActive: { backgroundColor: colors.primary },
  emoji:     { fontSize: 20 },
  btnText:   { fontSize: 14, fontWeight: '700', color: '#1F2937' },

  reportBtn: {
    position: 'absolute', bottom: 24, left: 16, right: 16, height: 56,
    backgroundColor: colors.error, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  reportText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // ── Search collapsed icon ────────────────────────────────────────────
  searchIconBtn: {
    position: 'absolute',
    top: 16,
    right: 68,   // sits left of the right controls column (right:16 + 48btn + 4gap)
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Search expanded panel ────────────────────────────────────────────
  searchPanel: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 68,   // stops before the right controls column
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  searchPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Vertical connector dots + line between origin and destination
  routeConnector: {
    position: 'absolute',
    left: 22,
    top: 58,
    bottom: 52,
    alignItems: 'center',
    zIndex: 1,
  },
  connectorDotGreen: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  connectorLine: {
    width: 2, flex: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 3,
  },
  connectorDotRed: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF4444',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingVertical: 4,
    paddingRight: 4,
    gap: 8,
    borderRadius: 8,
  },
  searchRowActive: {
    backgroundColor: '#F0F9FF',
  },
  searchRowInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 6,
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
    marginLeft: 22,
  },

  suggestions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 4,
    gap: 8,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },

  // ── Route card ──────────────────────────────────────────────────────
  routeCard: {
    position: 'absolute',
    bottom: 90,
    left: 76,   // clears zoom controls (left:16 + width:48 + gap:12)
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  routeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 10,
    marginBottom: 4,
    borderLeftWidth: 4,
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  routeMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  routeLoading: {
    position: 'absolute',
    bottom: 100,
    left: 76,   // clears zoom controls
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },

  // ── Route dots & arrow ───────────────────────────────────────────────
  originDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22C55E',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
  },
  originDotInner: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  destDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
  },
  destDotInner: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  // Legacy refs
  pinWrapper:  {},
  carMarker:   { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  originPin:   {},
  destPinNew:  {},
  pinLabel:    {},
  destPin:     {},
});

export default DisasterMap;