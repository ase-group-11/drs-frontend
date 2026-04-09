// ---------------------------------------------------------------------------
// FILE: src/components/organisms/DisasterMap/DisasterMap.tsx
//
// TRAFFIC: Static coloured road lines + animated dots travelling along them
//   - Road paths drawn as LineLayer (full geometry from backend)
//   - A glowing dot per segment moves along the road using requestAnimationFrame
//   - Dot speed reflects congestion: severe = slow crawl, light = fast flow
//   - No Animated API used (avoids _listeners crash on RN 0.83)
// ---------------------------------------------------------------------------

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
import { wsService, WSAlert } from '@services/wsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@constants/index';
import { authRequest } from '@services/authService';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

// --- Types ----------------------------------------------------------------

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
  onViewDetails?:  (disasterId: string) => void;  // navigate to DisasterDetailScreen
  selectedFilter?: string;
  onRerouteAlert?: (disasterId: string, routeAssignments: Record<string,string>) => void;
  hideSearch?:     boolean;
  isResponder?:    boolean;
}

export interface DisasterMapRef {
  flyToDisaster:              (disaster: Disaster) => void;
  navigateToScene:            (destLat: number, destLon: number, label: string) => void;
  applyRerouteAlert:          (disasterId: string, routeAssignments: Record<string,string>) => void;
  applyRerouteAlertWithGeometry: (disasterId: string, pts: [number,number][], meta: { time: number; dist: number } | null) => void;
  updateMyVehicle:            (lon: number, lat: number, progressPct: number) => void;
  clearVehicle:               () => void;
  clearReroute:               () => void;
}

// --- Reroute Types -------------------------------------------------------

interface RoutePoint { lat: number; lon: number; }

interface RerouteEntry {
  route_id:             string;
  points:               [number, number][]; // [lon, lat] Mapbox order
  travel_time_seconds:  number;
  length_meters:        number;
}



// --- Constants ------------------------------------------------------------

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

// Refined disaster icons: distinct, instantly readable shapes
const DISASTER_ICONS: Record<string, string> = {
  fire:                '🔥',
  flood:               '🌊',
  storm:               '🌩️',
  earthquake:          '💢',
  explosion:           '💥',
  gas_leak:            '🟡',
  hazmat:              '☣️',
  landslide:           '🪨',
  accident:            '🚧',
  building_collapse:   '🏚️',
  medical_emergency:   '🏥',
  power_outage:        '⚡',
  water_contamination: '🧪',
  crime:               '🔴',
  riot:                '🚧',
  terrorist_attack:    '💣',
  other:               '⚠️',
  hurricane:           '🌀',
  tornado:             '🌪️',
  tsunami:             '🌊',
  drought:             '🏜️',
  heatwave:            '🌡️',
  coldwave:            '🧊',
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6',
};

const getDisasterIcon  = (t: string) => DISASTER_ICONS[t?.toLowerCase()] || '⚠️';
const getSeverityColor = (s: string) => SEVERITY_COLORS[s?.toLowerCase()] || '#6B7280';

// --- Geometry helpers -----------------------------------------------------

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

// Interpolate a point at `t` (0->1) along the path
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

// --- GeoJSON builders -----------------------------------------------------

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

// --- Parse backend response -----------------------------------------------

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

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export const DisasterMap = forwardRef<DisasterMapRef, DisasterMapProps>(({
  disasters, loading, onReport, onViewDetails, selectedFilter = 'all', hideSearch, isResponder,
}, ref) => {

  const [mapStyle, setMapStyle]               = useState('light');
  const [is3D, setIs3D]                       = useState(true);
  const [zoom, setZoom]                       = useState(13);
  const [userLocation, setUserLocation]       = useState<[number, number]>([-6.2603, 53.3498]);
  const userLocationRef = useRef<[number, number]>([-6.2603, 53.3498]); // always current for closures
  const [mapLoaded, setMapLoaded]             = useState(false);
  const pendingNavigateRef = useRef<{ destLat: number; destLon: number; label: string } | null>(null);
  const [trafficSegments, setTrafficSegments] = useState<TrafficSegment[]>([]);
  const [showTraffic, setShowTraffic]         = useState(true);
  const [trafficLoading, setTrafficLoading]   = useState(false);
  const [selectedSegment, setSelectedSegment]     = useState<TrafficSegment | null>(null);
  const [selectedDisaster, setSelectedDisaster]   = useState<any | null>(null);
  const [disasterDetailLoading, setDisasterDetailLoading] = useState(false);

  // Dot positions: segmentId -> current [lon, lat]
  const [dotPositions, setDotPositions]       = useState<Record<string, [number, number]>>({});

  // -- Destination search + reroute state --------------------------------
  const [searchText, setSearchText]           = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [destinationPin, setDestinationPin]   = useState<[number, number] | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('');
  const [routes, setRoutes]                   = useState<RerouteEntry[]>([]); // kept for hook order
  const [routesLoading, setRoutesLoading]     = useState(false);
  const [showRoutes, setShowRoutes]           = useState(false);
  // Reroute overlay - drawn when WS reroute.triggered received
  const [rerouteOverlay, setRerouteOverlay]   = useState<[number,number][] | null>(null);
  const [rerouteDisasterId, setRerouteDisasterId] = useState<string | null>(null);
  // Vehicle simulation pin - Section 9: vehicle.location_updated WS event
  const [myVehiclePin, setMyVehiclePin]       = useState<[number,number] | null>(null);
  const [vehicleProgress, setVehicleProgress] = useState<number>(0);
  // Reroute status - null=no event, 'safe'=not in assignments, 'affected'=assigned reroute
  const [rerouteStatus, setRerouteStatus]     = useState<null | 'safe' | 'affected'>(null);
  const [rerouteRouteData, setRerouteRouteData] = useState<{ time: number; dist: number } | null>(null);
  const [searchExpanded, setSearchExpanded]     = useState(false);
  const [activeField, setActiveField]           = useState<'origin' | 'dest'>('dest');
  const [originText, setOriginText]             = useState('My Location');
  const [originPin, setOriginPin]               = useState<[number, number] | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [originLoading, setOriginLoading]       = useState(false);
  const originDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Animation progress: segmentId -> t (0->1, loops)
  const progressRef  = useRef<Record<string, number>>({});
  const segmentsRef  = useRef<TrafficSegment[]>([]);
  const rafRef       = useRef<number | null>(null);
  const lastTimeRef  = useRef<number | null>(null);
  const cameraRef    = useRef<MapboxGL.Camera>(null);

  // -- Location ---------------------------------------------------------
  useEffect(() => {
    Geolocation.getCurrentPosition(
      ({ coords: { longitude, latitude } }) => {
        const pos: [number, number] = [longitude, latitude];
        setUserLocation(pos);
        userLocationRef.current = pos;
        console.log('[Location] Updated:', latitude.toFixed(5), longitude.toFixed(5));
      },
      (err) => console.log('Location error:', err),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // -- Traffic fetch -----------------------------------------------------
  useEffect(() => {
    fetchTraffic();
    _restoreTripRegistration();
    const id = setInterval(fetchTraffic, 300000); // 5 min - reduces traffic API calls (free tier)
    return () => clearInterval(id);
  }, []);

  const fetchTraffic = async () => {
    console.log('[Traffic] Fetching 4 quadrants...');
    setTrafficLoading(true);
    try {
      // Split Dublin into 4 quadrants - each gets a 5x5 TomTom grid
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
          prog[s.id] = Math.random(); // intentional: stagger traffic dash animation
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

  // -- Animation loop (requestAnimationFrame, no Animated API) ----------
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

  // -- Disasters ---------------------------------------------------------
  const validDisasters = disasters.filter(d => {
    const lat = Number(d.location?.latitude);
    const lng = Number(d.location?.longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;
    if (selectedFilter === 'all') return true;
    return (d.type ?? '').toLowerCase() === selectedFilter.toLowerCase();
  });

  // -- Reroute WS handler --------------------------------------------------
  const handleRerouteAlert = React.useCallback(async (disasterId: string, routeAssignments: Record<string,string>) => {
    try {
      const stored = await AsyncStorage.getItem('@auth/user_data');
      if (!stored) return;
      const user = JSON.parse(stored);
      const routeId = routeAssignments[user.id];

      if (!routeId) {
        // User NOT in route_assignments - citizen doc Section 8:
        // show "no disaster on your route" message in the route card
        setRerouteStatus('safe');
        setRerouteRouteData(null);
        console.log('[Reroute] Not in route_assignments - showing safe route message');
        return;
      }

      // User IS in route_assignments - fetch full route geometry
      // GET /reroute/status/{disaster_id}/route/{route_id} - citizen-integration.md Section 8
      console.log('[Reroute] Fetching route geometry for disaster:', disasterId, 'route:', routeId);
      const routeData = await authRequest<any>(`/reroute/status/${disasterId}/route/${routeId}`);

      // Points come as [lat, lon] pairs - convert to [lon, lat] for Mapbox
      const pts: [number, number][] = (routeData?.points ?? []).map(
        (p: number[]) => [p[1], p[0]] as [number, number]
      );

      if (pts.length > 1) {
        setRerouteOverlay(pts);
        setRerouteDisasterId(disasterId);
        setRerouteStatus('affected');
        setRerouteRouteData({
          time: routeData?.travel_time_seconds ?? 0,
          dist: routeData?.length_meters ?? 0,
        });
        console.log(`[Reroute] Drawing reroute: ${pts.length} points`);
      } else {
        console.warn('[Reroute] Route has no points:', routeData);
      }
    } catch (e) { console.warn('[Reroute] Citizen route fetch failed:', e); }
  }, []);

  // // Actual navigation logic - called from ref or deferred via pendingNavigateRef
  // const _doNavigateToScene = useCallback(async (destLat: number, destLon: number, label: string) => {
  //   const origLon = userLocationRef.current[0];
  //   const origLat = userLocationRef.current[1];
  //   console.log('[_doNavigateToScene] From:', origLat.toFixed(5), origLon.toFixed(5), '->', destLat.toFixed(5), destLon.toFixed(5), '|', label);

  //   setDestinationPin([destLon, destLat]);
  //   setDestinationLabel(label);
  //   setShowRoutes(true);
  //   setRerouteStatus(null);

  //   try {
  //     const route = await fetchDirectRoute(origLon, origLat, destLon, destLat);
  //     if (route && route.points.length > 1) {
  //       console.log('[_doNavigateToScene] Route drawn:', route.points.length, 'pts,', Math.round(route.travel_time_seconds / 60), 'min');
  //       setRerouteOverlay(route.points);
  //       const lons = route.points.map(p => p[0]);
  //       const lats = route.points.map(p => p[1]);
  //       cameraRef.current?.fitBounds(
  //         [Math.max(...lons), Math.max(...lats)],
  //         [Math.min(...lons), Math.min(...lats)],
  //         [80, 80, 260, 80], 1200,
  //       );
  //     } else {
  //       console.warn('[_doNavigateToScene] No route returned - flying to destination');
  //       cameraRef.current?.setCamera({ centerCoordinate: [destLon, destLat], zoomLevel: 15, animationDuration: 1500 });
  //     }
  //   } catch (e) {
  //     console.error('[_doNavigateToScene] Failed:', e);
  //     cameraRef.current?.setCamera({ centerCoordinate: [destLon, destLat], zoomLevel: 15, animationDuration: 1500 });
  //   }
  // }, []);


  // Core navigation logic - called from ref or deferred on map load
  const _doNavigateToScene = useCallback(async (destLat: number, destLon: number, label: string) => {
    const origLon = userLocationRef.current[0];
    const origLat = userLocationRef.current[1];
    console.log('[_doNavigateToScene] From:', origLat.toFixed(5), origLon.toFixed(5), '->', destLat.toFixed(5), destLon.toFixed(5), '|', label);
    setDestinationPin([destLon, destLat]);
    setDestinationLabel(label);
    setShowRoutes(true);
    setRerouteStatus(null);
    try {
      const route = await fetchDirectRoute(origLon, origLat, destLon, destLat);
      if (route && route.points.length > 1) {
        console.log('[_doNavigateToScene] Route:', route.points.length, 'pts,', Math.round(route.travel_time_seconds / 60), 'min');
        setRerouteOverlay(route.points);
        const lons = route.points.map((p: [number,number]) => p[0]);
        const lats = route.points.map((p: [number,number]) => p[1]);
        cameraRef.current?.fitBounds(
          [Math.max(...lons), Math.max(...lats)],
          [Math.min(...lons), Math.min(...lats)],
          [80, 80, 260, 80], 1200,
        );
      } else {
        console.warn('[_doNavigateToScene] No route - flying to dest');
        cameraRef.current?.setCamera({ centerCoordinate: [destLon, destLat], zoomLevel: 15, animationDuration: 1500 });
      }
    } catch (e) {
      console.error('[_doNavigateToScene] Error:', e);
      cameraRef.current?.setCamera({ centerCoordinate: [destLon, destLat], zoomLevel: 15, animationDuration: 1500 });
    }
  }, []);

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
    navigateToScene: async (destLat: number, destLon: number, label: string) => {
      console.log('[navigateToScene] Called. mapLoaded:', mapLoaded, 'destLat:', destLat, 'destLon:', destLon);
      if (!mapLoaded) {
        // Map not ready yet - store and execute when map loads
        console.log('[navigateToScene] Map not loaded - storing as pending');
        pendingNavigateRef.current = { destLat, destLon, label };
        return;
      }
      _doNavigateToScene(destLat, destLon, label);
    },
    applyRerouteAlert: handleRerouteAlert,
    // Called by HomeScreen after fetching geometry on banner tap (citizen Section 8)
    applyRerouteAlertWithGeometry: (disasterId: string, pts: [number,number][], meta: { time: number; dist: number } | null) => {
      console.log('[DisasterMap] applyRerouteAlertWithGeometry:', pts.length, 'pts');
      setRerouteOverlay(pts);
      setRerouteDisasterId(disasterId);
      setRerouteStatus('affected');
      setRerouteRouteData(meta);
      setShowRoutes(true);
      const lons = pts.map((p: [number,number]) => p[0]);
      const lats = pts.map((p: [number,number]) => p[1]);
      cameraRef.current?.fitBounds(
        [Math.max(...lons), Math.max(...lats)],
        [Math.min(...lons), Math.min(...lats)],
        [80, 80, 260, 80], 1200,
      );
    },
    // Called by HomeScreen after fetching geometry on banner tap (citizen Section 8)
    // Section 9: vehicle.location_updated - move my vehicle pin
    updateMyVehicle: (lon: number, lat: number, progressPct: number) => {
      setMyVehiclePin([lon, lat]);
      setVehicleProgress(progressPct);
    },
    clearVehicle: () => {
      setMyVehiclePin(null);
      setVehicleProgress(0);
    },
    clearReroute: () => {
      setRerouteOverlay(null);
      setRerouteDisasterId(null);
      setRerouteStatus(null);
      setRerouteRouteData(null);
      setDestinationPin(null);
      setDestinationLabel('');
      setShowRoutes(false);
    },
  }));

  const handleMarkerPress = async (disaster: Disaster) => {
    setSelectedSegment(null);
    // Fly to marker
    cameraRef.current?.setCamera({
      centerCoordinate: [Number(disaster.location.longitude), Number(disaster.location.latitude)],
      zoomLevel: 17, pitch: is3D ? 60 : 0, animationDuration: 1000,
    });
    // Fetch full disaster detail — GET /disasters/{id}
    setDisasterDetailLoading(true);
    setSelectedDisaster({ ...disaster, _loading: true });
    try {
      const detail = await authRequest<any>(`/disasters/${disaster.id}`);
      console.log('[DisasterMap] Detail loaded for:', disaster.id, detail?.tracking_id);
      setSelectedDisaster(detail ?? disaster);
    } catch (e) {
      console.warn('[DisasterMap] Detail fetch failed:', e);
      setSelectedDisaster(disaster); // fallback to map data
    } finally {
      setDisasterDetailLoading(false);
    }
  };

  // -- Destination search + reroute handlers --------------------------

  // -- Geocoding helper ------------------------------------------------
  const geocodeQuery = async (text: string): Promise<any[]> => {
    try {
      const q = encodeURIComponent(text);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`
        + `?access_token=${EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
        + `&limit=5&country=IE&proximity=-6.2603,53.3498&types=poi,address,place,locality,postcode,district,neighborhood`;
      const res = await fetch(url);
      const data = await res.json();
      return data?.features ?? [];
    } catch { return []; }
  };

  // -- Mapbox direct route (no disaster) -------------------------------
  const fetchDirectRoute = async (
    origLon: number, origLat: number,
    destLon: number, destLat: number,
  ): Promise<RerouteEntry | null> => {
    console.log('[fetchDirectRoute] Calling Mapbox Directions:', origLat.toFixed(5), origLon.toFixed(5), '->', destLat.toFixed(5), destLon.toFixed(5));
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

  // -- Origin field search ----------------------------------------------
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

  // -- Destination field search -----------------------------------------
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

  // -- Register vehicle trip + show destination card ------------------
  const loadRoutes = async (destLat: number, destLon: number) => {
    // Resolve origin coordinates
    const origLon = originPin ? originPin[0] : userLocation[0];
    const origLat = originPin ? originPin[1] : userLocation[1];

    // POST /vehicles/register - citizen-integration.md Section 5
    // Register so backend sends reroute.triggered WS event if a disaster hits the route
    await _registerVehicleTrip(origLon, origLat, destLon, destLat);

    // Show the destination card so user knows they're registered.
    // No Mapbox route drawn - routes only come from WS reroute.triggered events.
    setShowRoutes(true);
    setRerouteStatus(null);
    setRerouteRouteData(null);
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

  // -- Vehicle trip registration - enables reroute targeting ---------------

  // GET /vehicles/register/{user_id} - citizen-integration.md
  // Restore active trip on app start (trip expires after 2hrs on backend)
  const _restoreTripRegistration = async () => {
    try {
      const stored = await AsyncStorage.getItem('@auth/user_data');
      if (!stored) return;
      const user = JSON.parse(stored);
      if (!user?.id) return;
      const res = await fetch(`${API_BASE_URL}/vehicles/register/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.registered) {
          console.log('[Vehicles] Active trip restored:', data.dest_lat, data.dest_lng);
          // Show destination pin from restored trip
          if (data.dest_lat && data.dest_lng) {
            setDestinationPin([data.dest_lng, data.dest_lat]);
          }
        }
      }
    } catch { /* silent - fresh start */ }
  };

  const _registerVehicleTrip = async (
    origLon: number, origLat: number, destLon: number, destLat: number,
  ) => {
    try {
      const stored = await AsyncStorage.getItem('@auth/user_data');
      if (!stored) return;
      const user = JSON.parse(stored);
      if (!user?.id) return;
      await fetch(`${API_BASE_URL}/vehicles/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      user.id,
          current_lat:  origLat,
          current_lng:  origLon,
          dest_lat:     destLat,
          dest_lng:     destLon,
          vehicle_type: 'general',
        }),
      });
      console.log('[Vehicles] Trip registered for reroute targeting');
    } catch (e) { console.warn('[Vehicles] Trip registration failed:', e); }
  };

  const _deregisterVehicleTrip = async () => {
    try {
      const stored = await AsyncStorage.getItem('@auth/user_data');
      if (!stored) return;
      const user = JSON.parse(stored);
      if (!user?.id) return;
      await fetch(`${API_BASE_URL}/vehicles/register/${user.id}`, { method: 'DELETE' });
      console.log('[Vehicles] Trip deregistered');
    } catch { /* silent */ }
  };

  const clearDestination = () => {
    setRerouteStatus(null);
    setRerouteRouteData(null);
    setDestinationPin(null);
    setDestinationLabel('');
    setOriginPin(null);
    setShowRoutes(false);
    setSearchText('');
    setSearchSuggestions([]);
    setOriginText('My Location');
    setOriginSuggestions([]);
    setSearchExpanded(false);
    _deregisterVehicleTrip();
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

  // ---------------------------------------------------------------------
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
    console.log('[DisasterMap] Map loaded - checking pending navigation');
    if (pendingNavigateRef.current) {
      const { destLat, destLon, label } = pendingNavigateRef.current;
      pendingNavigateRef.current = null;
      setTimeout(() => {
        console.log('[DisasterMap] Executing deferred navigateToScene:', destLat, destLon);
        _doNavigateToScene(destLat, destLon, label);
      }, 400);
    }
          setTrafficSegments(prev => [...prev]);
        }}
        onDidFinishLoadingStyle={() => {
          // Fires every time the style (re)loads - including after light/dark switch
          setMapLoaded(true);
    console.log('[DisasterMap] Map loaded - checking pending navigation');
    if (pendingNavigateRef.current) {
      const { destLat, destLon, label } = pendingNavigateRef.current;
      pendingNavigateRef.current = null;
      setTimeout(() => {
        console.log('[DisasterMap] Executing deferred navigateToScene:', destLat, destLon);
        _doNavigateToScene(destLat, destLon, label);
      }, 400);
    }
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

        {/* -- 3D layers -- */}
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

        {/* -- Traffic road lines (static, one source per level) -- */}
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

        {/* -- Animated dots - single ShapeSource updated each frame -- */}
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

        {/* Route lines drawn ONLY from WS reroute.triggered - see rerouteOverlay below */}

        {/* -- Origin dot - small green circle -- */}
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

        {/* -- Destination dot - small red circle -- */}
        {destinationPin && (
          <MapboxGL.MarkerView id="dest-pin" coordinate={destinationPin}>
            <View style={styles.destDot}>
              <View style={styles.destDotInner} />
            </View>
          </MapboxGL.MarkerView>
        )}

        {/* -- Vehicle simulation pin - Section 9: vehicle.location_updated -- */}
        {myVehiclePin && (
          <MapboxGL.MarkerView id="my-vehicle-pin" coordinate={myVehiclePin}>
            <View style={styles.vehiclePin}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
              {vehicleProgress > 0 && (
                <View style={styles.vehicleProgressBadge}>
                  <Text style={styles.vehicleProgressTxt}>{vehicleProgress}%</Text>
                </View>
              )}
            </View>
          </MapboxGL.MarkerView>
        )}

        {/* -- WS Reroute overlay (citizen-specific assigned route) -- */}
        {rerouteOverlay && rerouteOverlay.length > 1 && (
          <MapboxGL.ShapeSource
            id="reroute-ws-src"
            shape={{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: rerouteOverlay },
              properties: {},
            }}
          >
            <MapboxGL.LineLayer
              id="reroute-ws-outline"
              style={{ lineColor: '#fff', lineWidth: 7, lineCap: 'round', lineOpacity: 0.7 }}
            />
            <MapboxGL.LineLayer
              id="reroute-ws-line"
              style={{ lineColor: '#F97316', lineWidth: 5, lineCap: 'round', lineDasharray: [1, 0] }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Dismiss reroute button */}
        {rerouteOverlay && (
          <MapboxGL.MarkerView id="reroute-dismiss" coordinate={rerouteOverlay[Math.floor(rerouteOverlay.length / 2)]}>
            <TouchableOpacity
              style={{ backgroundColor: '#F97316', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => { setRerouteOverlay(null); setRerouteDisasterId(null); }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕ Clear Reroute</Text>
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        )}


        {/* -- Disaster markers -- */}
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

      {/* Disaster detail bottom sheet */}
      {selectedDisaster && (
        <View style={[styles.disasterSheet, isResponder && { bottom: 32, left: 80 }]}>
          <View style={styles.disasterSheetHandle} />
          <View style={styles.disasterSheetHeader}>
            <Text style={{ fontSize: 26 }}>
              {getDisasterIcon((selectedDisaster.type ?? selectedDisaster.disaster_type ?? '').toLowerCase())}
            </Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.disasterSheetType}>
                {(selectedDisaster.type ?? selectedDisaster.disaster_type ?? 'Disaster').replace(/_/g, ' ').toUpperCase()}
              </Text>
              {selectedDisaster.tracking_id && (
                <Text style={styles.disasterSheetTracking}>{selectedDisaster.tracking_id}</Text>
              )}
            </View>
            <View style={[styles.disasterSheetSevPill, { backgroundColor: getSeverityColor(selectedDisaster.severity ?? '') + '22' }]}>
              <Text style={[styles.disasterSheetSevTxt, { color: getSeverityColor(selectedDisaster.severity ?? '') }]}>
                {(selectedDisaster.severity ?? 'UNKNOWN').toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDisaster(null)}
              style={styles.disasterSheetClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
              <Text style={{ fontSize: 18, color: '#6B7280' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {disasterDetailLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.disasterSheetAddr} numberOfLines={2}>
                📍 {selectedDisaster.location_address ?? selectedDisaster.location?.address ?? 'Unknown location'}
              </Text>
              <View style={styles.disasterSheetRow}>
                {!!selectedDisaster.disaster_status && (
                  <View style={styles.disasterSheetChip}>
                    <Text style={styles.disasterSheetChipTxt}>{selectedDisaster.disaster_status}</Text>
                  </View>
                )}
                {!!selectedDisaster.assigned_department && (
                  <View style={[styles.disasterSheetChip, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[styles.disasterSheetChipTxt, { color: '#C2410C' }]}>{selectedDisaster.assigned_department}</Text>
                  </View>
                )}
                {(selectedDisaster.people_affected ?? 0) > 0 && (
                  <View style={[styles.disasterSheetChip, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.disasterSheetChipTxt, { color: '#DC2626' }]}>👥 {selectedDisaster.people_affected} affected</Text>
                  </View>
                )}
              </View>
              {!!selectedDisaster.description && (
                <Text style={styles.disasterSheetDesc} numberOfLines={3}>{selectedDisaster.description}</Text>
              )}
              {/* ── View Full Details button ── */}
              {onViewDetails && (
                <TouchableOpacity
                  style={styles.disasterSheetBtn}
                  onPress={() => {
                    const id = selectedDisaster.id ?? selectedDisaster.disaster_id;
                    if (id) {
                      setSelectedDisaster(null);
                      onViewDetails(id);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.disasterSheetBtnTxt}>View Full Details →</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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

      {/* -- Search: collapsed icon OR expanded panel -- */}
      {!isResponder && !searchExpanded ? (
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
      ) : !isResponder && searchExpanded ? (
        /* Expanded: Google Maps-style panel - left:12, right stops before dark/2D buttons (right:68) */
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
      ) : null}

      {/* -- Route Info Card -- */}
      {showRoutes && (
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeCardTitle}>
              {rerouteStatus === 'affected' ? '⚠️  Route Affected' : '🗺️  Route to ' + destinationLabel.split(',')[0]}
            </Text>
            <TouchableOpacity onPress={clearDestination} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* -- SAFE: no disaster on this route -- */}
          {rerouteStatus === 'safe' && (
            <View style={styles.routeSafeBox}>
              <Text style={styles.routeSafeIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeSafeTitle}>Your route is clear</Text>
                <Text style={styles.routeSafeSub}>
                  There is no disaster on your route. Continue on your original route.
                </Text>
              </View>
            </View>
          )}

          {/* -- AFFECTED: disaster on route - show original blocked + assigned reroute -- */}
          {rerouteStatus === 'affected' && (
            <>
              {/* Original route - blocked */}
              <View style={[styles.routeRow, { borderLeftColor: '#EF4444' }]}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeLabel, { color: '#EF4444' }]}>Original route (blocked)</Text>
                  <Text style={styles.routeMeta}>Disaster detected on your route</Text>
                </View>
              </View>
              {/* Assigned reroute */}
              {rerouteOverlay && rerouteOverlay.length > 0 && (
                <View style={[styles.routeRow, { borderLeftColor: '#F97316', marginTop: 4 }]}>
                  <View style={[styles.routeDot, { backgroundColor: '#F97316' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routeLabel, { color: '#F97316' }]}>Assigned detour</Text>
                    <Text style={styles.routeMeta}>
                      {rerouteRouteData && rerouteRouteData.time > 0
                        ? `${Math.round(rerouteRouteData.time / 60)} min  ·  ${(rerouteRouteData.dist / 1000).toFixed(1)} km`
                        : 'Follow the orange route on map'}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* -- DEFAULT: trip registered, monitoring for reroute events -- */}
          {!rerouteStatus && (
            <View style={[styles.routeRow, { borderLeftColor: '#3B82F6' }]}>
              <View style={[styles.routeDot, { backgroundColor: '#3B82F6' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeLabel, { color: '#3B82F6' }]}>Trip registered</Text>
                <Text style={styles.routeMeta}>
                  You'll be notified if a disaster affects your route
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Route loading spinner - shown while registering vehicle */}
      {routesLoading && (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>Registering trip...</Text>
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
      <View style={[styles.leftControls, isResponder && { bottom: 32 }]}>
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

// --- Styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },

  marker: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 10,
  },
  markerPulse: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
    opacity: 0.25,
  },
  markerIcon: { fontSize: 28, textAlign: 'center' },
  markerCriticalDot: {
    position: 'absolute', top: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff',
  },

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

  // -- Search collapsed icon --------------------------------------------
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

  // -- Search expanded panel --------------------------------------------
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

  // -- Route card ------------------------------------------------------
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
  routeSafeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 4,
  },
  routeSafeIcon:  { fontSize: 20 },
  routeSafeTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  routeSafeSub:   { fontSize: 12, color: '#4D7C5F', marginTop: 2, lineHeight: 17 },
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
    left: 76,
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

  // -- Route dots & arrow -----------------------------------------------
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

  // -- Disaster detail bottom sheet ------------------------------------
  disasterSheet: {
    position: 'absolute',
    bottom: 96,   // above report button (24 + 56 + 16)
    left: 76,     // clear zoom controls (left:16 + btn:48 + gap:12)
    right: 12,
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 12,
    maxHeight: 220,
  },
  disasterSheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 12,
  },
  disasterSheetHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6,
  },
  disasterSheetType: {
    fontSize: 15, fontWeight: '800', color: '#111827', letterSpacing: 0.3,
  },
  disasterSheetTracking: {
    fontSize: 11, color: '#9CA3AF', marginTop: 1,
  },
  disasterSheetSevPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  disasterSheetSevTxt: {
    fontSize: 11, fontWeight: '800',
  },
  disasterSheetClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  disasterSheetAddr: {
    fontSize: 13, color: '#4B5563', marginBottom: 10, lineHeight: 18,
  },
  disasterSheetRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8,
  },
  disasterSheetChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  disasterSheetChipTxt: {
    fontSize: 11, fontWeight: '700', color: '#166534',
  },
  disasterSheetDesc: {
    fontSize: 13, color: '#6B7280', lineHeight: 18,
  },
  disasterSheetBtn: {
    marginTop: 10,
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disasterSheetBtnTxt: {
    color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3,
  },
});

export default DisasterMap;