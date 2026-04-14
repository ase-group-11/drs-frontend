// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/HomeScreen/HomeScreen.tsx
// Drawer uses original working Modal + fade pattern (no Animated API)
// Enhanced with full ProfileMenu content and all screen navigation
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Modal, View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapHeader }   from '@organisms/MapHeader';
import { DisasterMap } from '@organisms/DisasterMap';
import { FilterTabs }  from '@organisms/FilterTabs';
import { MapTemplate } from '@templates/MapTemplate';
import { ProfileMenu } from '@organisms/ProfileMenu';
import { ResponderProfileMenu } from '@organisms/ResponderProfileMenu';
import { authService, authRequest, getUserUnitInfo } from '@services/authService';
import { API } from '@services/apiConfig';
import { wsService, WSAlert } from '@services/wsService';
import { useUserLocation } from '@hooks/useUserLocation';
import { mapActionStore } from '@services/mapActionStore';
import { initNotifications } from '@services/notificationService';
import { disasterStore } from '@services/disasterStore';
import { notificationStore } from '@services/notificationStore'; // used only for reroute geometry caching
import { colors }      from '@theme/colors';
import type { Disaster, DisasterFilter } from '../../types/disaster';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
interface HomeScreenProps { navigation: HomeScreenNavigationProp; route?: any; }

// Static filter tabs — always show all backend-supported disaster types.
// The map just shows empty if no disasters of that type exist currently.
const FILTERS: DisasterFilter[] = [
  { id: 'all',        label: '📍 All',        icon: '📍' },
  { id: 'fire',       label: '🔥 Fire',       icon: '🔥', type: 'fire' },
  { id: 'flood',      label: '🌊 Flood',      icon: '🌊', type: 'flood' },
  { id: 'storm',      label: '⛈️ Storm',       icon: '⛈️', type: 'storm' },
  { id: 'earthquake', label: '🏚️ Earthquake', icon: '🏚️', type: 'earthquake' },
  { id: 'hurricane',  label: '🌀 Hurricane',  icon: '🌀', type: 'hurricane' },
  { id: 'tornado',    label: '🌪️ Tornado',    icon: '🌪️', type: 'tornado' },
  { id: 'tsunami',    label: '🌊 Tsunami',    icon: '🌊', type: 'tsunami' },
  { id: 'drought',    label: '🏜️ Drought',    icon: '🏜️', type: 'drought' },
  { id: 'heatwave',   label: '🌡️ Heatwave',   icon: '🌡️', type: 'heatwave' },
  { id: 'coldwave',   label: '🧊 Coldwave',   icon: '🧊', type: 'coldwave' },
  { id: 'other',      label: '⚠️ Other',      icon: '⚠️', type: 'other' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const [disasters, setDisasters]                 = useState<Disaster[]>([]);
  const insets     = useSafeAreaInsets();
  const [filteredDisasters, setFilteredDisasters] = useState<Disaster[]>([]);
  const [selectedFilter, setSelectedFilter]       = useState('all');
  const [loading, setLoading]                     = useState(true);
  // Citizen GPS location — sent to backend every 30s for geo-targeted alerts
  const { location: citizenLocation, permissionDenied: locationDenied } = useUserLocation();
  const [userName, setUserName]                   = useState('User');
  const [userPhone, setUserPhone]                 = useState('');
  const [userInitials, setUserInitials]           = useState('U');
  const [notificationCount]                       = useState(0);
  const [alertCount, setAlertCount]               = useState(0);
  const [menuVisible, setMenuVisible]             = useState(false);
  const [wsConnected, setWsConnected]             = useState(false);
  const [activeAlert, setActiveAlert]             = useState<WSAlert | null>(null);
  const [pendingReroute, setPendingReroute]       = useState<{
    disasterId: string; routeId: string;
    routeMeta: { time: number; dist: number } | null;
    cachedPts:  [number, number][] | null;
  } | null>(null);
  const [isResponder, setIsResponder]             = useState(false);
  const [responderData, setResponderData]         = useState<any>(null);
  const [responderRouteActive, setResponderRouteActive] = useState(false);
  const [citizenRouteActive, setCitizenRouteActive]     = useState(false);
  const [loadError, setLoadError]                 = useState(false);
  const [missionCount, setMissionCount]           = useState(0);
  const mapRef      = useRef<any>(null);
  const pendingNav       = useRef<{ lat: number; lon: number; label: string } | null>(null);

  // Handle navigation params — only used for reroute from AlertsScreen
  // flyTo + evacuationRoute now use mapActionStore to avoid race conditions
  useEffect(() => {
    const params = route?.params as any;
    if (!params) return;
    if (params?.reroutePts && params.reroutePts.length > 1) {
      console.log('[HomeScreen] Received reroutePts from AlertsScreen:', params.reroutePts.length);
      setTimeout(() => {
        if (mapRef.current?.applyRerouteAlertWithGeometry) {
          mapRef.current.applyRerouteAlertWithGeometry(
            params.rerouteDisaster ?? '',
            params.reroutePts,
            params.rerouteMeta ?? null,
          );
          setCitizenRouteActive(true);
        }
      }, 800);
    } else if (params?.routeUnavailable) {
      setActiveAlert({
        event_type: 'route.unavailable', severity: 'LOW',
        title: 'Route Not Available',
        message: 'Your reroute plan has expired or is not yet available. Check back shortly.',
        service: '', colour: '', data: {}, timestamp: new Date().toISOString(),
      } as any);
    }
  }, [route?.params]);

  // Execute pending map action on focus — uses mapActionStore to avoid params race
  useFocusEffect(useCallback(() => {
    // Reconnect WS if it dropped while screen was not focused
    if (!wsService.connected) {
      AsyncStorage.getItem('@auth/user_role').then(role => {
        console.log('[HomeScreen] WS not connected on focus — reconnecting as', role);
        wsService.connect(role === 'responder');
      });
    }

    // Poll every 200ms for up to 4s until mapRef is ready to execute action
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (attempts > 20) { clearInterval(interval); return; }
      if (!mapActionStore.hasPending()) { clearInterval(interval); return; }

      const action = mapActionStore.consume();
      if (!action) { clearInterval(interval); return; }

      console.log('[HomeScreen] Map action:', action.type, action.lat, action.lon);

      if (action.type === 'flyTo' && mapRef.current?.navigateToScene) {
        mapRef.current.navigateToScene(action.lat, action.lon, action.label);
        clearInterval(interval);
        // If this flyTo came from "Navigate to Disaster", fetch the active reroute
        // plan and draw the route overlay so the responder can see the path.
        if (action.disasterId) {
          const disasterId = action.disasterId;
          setResponderRouteActive(false);
          authRequest<any>(API.reroute.plans())
            .then(async (res: any) => {
              // plans endpoint may return array or single plan
              const plans: any[] = Array.isArray(res) ? res : (res?.plans ?? [res]);
              const plan = plans.find((p: any) => p.disaster_id === disasterId);
              if (!plan) return;

              if (isResponder) {
                // Responder: use the first chosen route
                const routes: any[] = plan?.chosen_routes ?? [];
                if (routes.length > 0 && Array.isArray(routes[0].points) && routes[0].points.length > 1) {
                  // Backend returns [lat, lon]; Mapbox needs [lon, lat]
                  const pts: [number, number][] = routes[0].points.map(
                    (p: number[]) => [p[1], p[0]] as [number, number],
                  );
                  const meta = {
                    time: routes[0].travel_time_seconds ?? 0,
                    dist: routes[0].length_meters ?? 0,
                  };
                  mapRef.current?.applyRerouteAlertWithGeometry?.(disasterId, pts, meta);
                  setResponderRouteActive(true);
                }
              } else {
                // Citizen: look up their specific assigned route
                try {
                  const stored = await AsyncStorage.getItem('@auth/user_data');
                  const user = stored ? JSON.parse(stored) : null;
                  const routeAssignments: Record<string, string> = plan.route_assignments ?? {};
                  const assignedRouteId = user ? routeAssignments[user.id] : null;
                  if (!assignedRouteId) return; // not yet assigned — fly only
                  const routeData = await authRequest<any>(
                    API.reroute.status(disasterId, assignedRouteId),
                  );
                  const pts: [number, number][] = (routeData?.points ?? []).map(
                    (p: number[]) => [p[1], p[0]] as [number, number],
                  );
                  if (pts.length > 1) {
                    const meta = {
                      time: routeData.travel_time_seconds ?? 0,
                      dist: routeData.length_meters ?? 0,
                    };
                    mapRef.current?.applyRerouteAlertWithGeometry?.(disasterId, pts, meta);
                    setCitizenRouteActive(true);
                  } else {
                    setActiveAlert({
                      event_type: 'route.info', severity: 'MEDIUM',
                      title: 'Route Unavailable',
                      message: 'Your assigned route could not be loaded. Check back shortly.',
                      service: '', colour: '', data: {}, timestamp: new Date().toISOString(),
                    } as any);
                  }
                } catch (e) {
                  console.warn('[HomeScreen] Citizen route fetch failed:', e);
                  setActiveAlert({
                    event_type: 'route.error', severity: 'MEDIUM',
                    title: 'Route Unavailable',
                    message: 'Could not load your assigned route. Please try again.',
                    service: '', colour: '', data: {}, timestamp: new Date().toISOString(),
                  } as any);
                }
              }
            })
            .catch(() => { /* No plan yet — map still flies to disaster */ });
        }
      } else if (action.type === 'evacuationRoute' && mapRef.current?.showEvacuationRoute) {
        mapRef.current.showEvacuationRoute(action.lat, action.lon, action.label);
        clearInterval(interval);
      } else {
        // mapRef method not ready yet — put action back and retry next tick
        mapActionStore.setPending(action);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isResponder]));

  useEffect(() => {
    loadDisasters();
    loadUserData();
    loadAlertCount();

    // Subscribe to disasterStore — re-read disasters when store changes
    // (wsService dispatches to store on WS events, so this is reactive)
    const unsubStore2 = disasterStore.subscribe(() => {
      const activeList = disasterStore.getState().activeDisasters;
      const converted = activeList
        .map((d: any) => ({
          id: d.id || String(Math.random()),
          type: (d.type || d.disaster_type || 'other').toLowerCase(),
          severity: (d.severity || 'medium').toLowerCase(),
          title: `${d.type || d.disaster_type || 'Disaster'} - ${d.severity}`,
          location: {
            latitude: d.location?.lat ?? d.lat ?? d.latitude ?? 53.35,
            longitude: d.location?.lon ?? d.lon ?? d.longitude ?? -6.26,
            address: d.location_address ?? d.description ?? 'Disaster location',
          },
          description: d.description || d.location_address || '',
          reportedAt: d.created_at ? new Date(d.created_at) : new Date(),
          status: (d.disaster_status ?? d.status ?? 'active').toLowerCase(),
        }))
        .filter((d: any) => d.location.latitude && d.location.longitude);
      setDisasters(converted);
    });

    // Connect WebSocket for real-time alerts
    const connectWS = async () => {
      const role = await AsyncStorage.getItem('@auth/user_role');
      wsService.connect(role === 'responder');
    };
    connectWS();

    // Request notification permission + setup channels
    initNotifications().catch(() => {});

    const unsubAlert   = wsService.onAlert(handleWSAlert);
    const unsubConnect = wsService.onConnect(setWsConnected);
    const unsubDisasterStore = disasterStore.subscribe(() => {
      setAlertCount(disasterStore.unreadCount);
    });

    return () => {
      unsubAlert();
      unsubConnect();
      unsubDisasterStore();
      unsubStore2();
      wsService.disconnect();
    };
  }, []);

  // ── Citizen location → backend every 30 seconds ──────────────────────
  // The backend uses this to geo-target disaster alerts to nearby citizens.
  // Without periodic updates, the backend sees the Dublin default coordinates
  // and the citizen may miss alerts for disasters near their actual location.
  // Citizens only — responders use a separate deployment location endpoint.
  useEffect(() => {
    if (isResponder) return; // responders handled separately
    if (locationDenied) return; // don't send Dublin defaults when permission is denied
    const [lon, lat] = citizenLocation;
    // Send immediately on location change
    wsService.updateLocation(lat, lon);
    // Then re-send every 30 seconds to keep backend location fresh
    const interval = setInterval(() => {
      wsService.updateLocation(lat, lon);
    }, 30_000);
    return () => clearInterval(interval);
  }, [citizenLocation, isResponder, locationDenied]);

  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredDisasters(disasters);
    } else {
      setFilteredDisasters(disasters.filter(d => d.type === selectedFilter));
    }
  }, [selectedFilter, disasters]);

  const loadAlertCount = () => {
    setAlertCount(disasterStore.unreadCount);
  };

  const loadDisasters = async () => {
    try {
      // Spec: use GET /disasters/active?limit=50 — NOT live-map/disasters
      // This populates the global disasterStore. All screens read from the store.
      // On subsequent WS events, wsService dispatches directly to the store.
      const storeState = disasterStore.getState();

      // Only fetch from API if store is empty (first load)
      // After that, wsService handles updates via disaster.evaluated → fetch,
      // disaster.dispatched → in-place, disaster.updated → merge, etc.
      if (storeState.activeDisasters.length === 0) {
        const data = await authRequest<any>(API.disasters.active());
        const list = data?.disasters ?? (Array.isArray(data) ? data : []);
        disasterStore.setActiveDisasters(list);
      }

      // Read from store and convert to Disaster[] format for the map
      const activeList = disasterStore.getState().activeDisasters;
      const converted = activeList
        .map((d: any) => ({
          id: d.id || String(Math.random()),
          type: (d.type || d.disaster_type || 'other').toLowerCase(),
          severity: (d.severity || 'medium').toLowerCase(),
          title: `${d.type || d.disaster_type || 'Disaster'} - ${d.severity}`,
          location: {
            latitude: d.location?.lat ?? d.lat ?? d.latitude ?? 53.35,
            longitude: d.location?.lon ?? d.lon ?? d.longitude ?? -6.26,
            address: d.location_address ?? d.description ?? 'Disaster location',
          },
          description: d.description || d.location_address || '',
          reportedAt: d.created_at ? new Date(d.created_at) : new Date(),
          status: (d.disaster_status ?? d.status ?? 'active').toLowerCase(),
        }))
        .filter((d: any) => d.location.latitude && d.location.longitude);

      setDisasters(converted);
      setLoadError(false);
      console.log('[HomeScreen] Disasters from store:', converted.length);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load disasters:', error);
      setLoadError(true);
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const role = await AsyncStorage.getItem('@auth/user_role');
      const user = await authService.getStoredUser();
      if (user) {
        const name = user.full_name || 'User';
        setUserName(name);
        setUserPhone(user.phone_number || '');
        setUserInitials(getInitials(name));
      }
      if (role === 'responder' && user) {
        setIsResponder(true);
        setResponderData(user);
        // ERT-only APIs — only called when role === 'responder', not for citizens
        try {
          const { unitId } = await getUserUnitInfo();
          if (unitId) {
            const data = await authRequest(API.deployments.unitActive(unitId));
            setMissionCount(data?.count ?? 0);
          }
        } catch { /* no missions or unit not found — badge stays 0 */ }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleRerouteBannerTap = async () => {
    if (!pendingReroute) return;
    const { disasterId, routeId, routeMeta, cachedPts } = pendingReroute;
    console.log('[Reroute] Banner tapped, cachedPts:', cachedPts?.length ?? 'none');
    setActiveAlert(null);
    setPendingReroute(null);

    let pts: [number, number][] | null = cachedPts;

    // If no cached geometry (pre-fetch failed), try fetching now
    if (!pts || pts.length < 2) {
      try {
        console.log('[Reroute] No cache - fetching geometry now:', routeId);
        const routeData = await authRequest<any>(API.reroute.status(disasterId, routeId));
        pts = (routeData?.points ?? []).map(
          (p: number[]) => [p[1], p[0]] as [number, number]
        );
        console.log('[Reroute] Geometry fetched on tap:', pts?.length, 'points');
      } catch (e: any) {
        console.error('[Reroute] Fetch failed on tap:', e.message);
      }
    }

    if (pts && pts.length > 1 && mapRef.current?.applyRerouteAlertWithGeometry) {
      mapRef.current.applyRerouteAlertWithGeometry(disasterId, pts, routeMeta ?? null);
    } else {
      console.warn('[Reroute] No route geometry available to draw');
    }
  };

  const handleWSAlert = async (alert: WSAlert) => {
    // wsService already dispatches disaster.evaluated/dispatched/updated/resolved/false_alarm
    // to the disasterStore, which triggers the store subscription above.
    // No need to call loadDisasters() here — store is the single source of truth.

    // disaster.cleared / disaster.resolved — roads reopened, clear reroute overlay and banners
    if (alert.event_type === 'disaster.cleared' || alert.event_type === 'disaster.resolved') {
      mapRef.current?.clearReroute?.();
      setCitizenRouteActive(false);
      setResponderRouteActive(false);
      setPendingReroute(null);
      setActiveAlert(null);
    }

    // Citizen reroute — citizen-integration.md Section 8
    if (alert.event_type === 'reroute.triggered') {
      const data = alert.data ?? {};
      const disasterId = data.disaster_id as string;
      const routeAssignments: Record<string,string> = data.route_assignments ?? {};
      // routes[] in the WS payload already has time/dist metadata
      const routes: any[] = data.routes ?? [];

      try {
        const stored = await AsyncStorage.getItem('@auth/user_data');
        const user = stored ? JSON.parse(stored) : null;
        const userRouteId = user ? routeAssignments[user.id] : null;

        if (!userRouteId) {
          // User NOT in route_assignments — general area alert, no route to draw
          console.log('[Reroute] Not in route_assignments — showing area alert');
          setActiveAlert({
            ...alert,
            title:   'Rerouting in Your Area',
            message: 'A disaster has affected nearby roads. Check the map for updates.',
          });
          return;
        }

        // User IS in route_assignments — eagerly fetch geometry now (plan is active)
        // Store geometry in pendingReroute so banner tap has it instantly
        const routeMeta = routes.find((r: any) => r.route_id === userRouteId);
        console.log('[Reroute] User in route_assignments, routeId:', userRouteId, 'fetching geometry...');

        // Fetch geometry immediately while plan is still active in the DB
        let cachedPts: [number, number][] | null = null;
        try {
          const routeData = await authRequest<any>(API.reroute.status(disasterId, userRouteId));
          cachedPts = (routeData?.points ?? []).map(
            (p: number[]) => [p[1], p[0]] as [number, number]
          );
          console.log('[Reroute] Geometry pre-fetched:', cachedPts.length, 'points');
          // Cache geometry so AlertsScreen can use it without re-fetching
          const meta = routeMeta
            ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters }
            : null;
          await notificationStore.updateCachedGeometry(alert.timestamp, cachedPts, meta);
        } catch (e) {
          console.warn('[Reroute] Geometry pre-fetch failed (will retry on tap):', e);
        }

        setPendingReroute({
          disasterId,
          routeId: userRouteId,
          routeMeta: routeMeta
            ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters }
            : null,
          cachedPts,
        });
        setActiveAlert({
          ...alert,
          title:   '⚠️ Your Route is Affected',
          message: 'A disaster is on your route. Tap to see your detour on the map.',
        });
      } catch (e) {
        console.warn('[Reroute] Handler error:', e);
      }
      return; // skip generic banner below
    }

    // Section 8: route.updated — same flow as reroute.triggered, fetch new geometry
    if (alert.event_type === 'route.updated') {
      const data = alert.data ?? {};
      const disasterId = data.disaster_id as string;
      const routeAssignments: Record<string,string> = data.route_assignments ?? {};
      const routes: any[] = data.routes ?? [];

      try {
        const stored = await AsyncStorage.getItem('@auth/user_data');
        const user = stored ? JSON.parse(stored) : null;
        const userRouteId = user ? routeAssignments[user.id] : null;
        if (!userRouteId) {
          setActiveAlert({ ...alert, title: 'Route Updated', message: 'Rerouting has been updated in your area.' });
          return;
        }
        const routeMeta = routes.find((r: any) => r.route_id === userRouteId);
        let cachedPts: [number, number][] | null = null;
        try {
          const routeData = await authRequest<any>(API.reroute.status(disasterId, userRouteId));
          cachedPts = (routeData?.points ?? []).map((p: number[]) => [p[1], p[0]] as [number, number]);
          console.log('[route.updated] New geometry:', cachedPts.length, 'pts');
          const meta2 = routeMeta ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters } : null;
          await notificationStore.updateCachedGeometry(alert.timestamp, cachedPts, meta2);
        } catch (e) { console.warn('[route.updated] Geometry fetch failed:', e); }

        setPendingReroute({ disasterId, routeId: userRouteId,
          routeMeta: routeMeta ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters } : null,
          cachedPts });
        setActiveAlert({ ...alert, title: '🔄 Route Recalculated', message: 'Your detour has been updated. Tap to view.' });
      } catch (e) { console.warn('[route.updated] Handler error:', e); }
      return;
    }

    // Section 9: vehicle.location_updated — move my vehicle pin on the map
    if (alert.event_type === 'vehicle.location_updated') {
      try {
        const stored = await AsyncStorage.getItem('@auth/user_data');
        if (stored) {
          const user = JSON.parse(stored);
          const vehicles: any[] = alert.data?.vehicles ?? [];
          // Filter vehicles array by own user_id per citizen doc Section 9
          const myVehicle = vehicles.find((v: any) => v.user_id === user.id);
          if (myVehicle && mapRef.current?.updateMyVehicle) {
            mapRef.current.updateMyVehicle(
              myVehicle.lng,
              myVehicle.lat,
              myVehicle.progress_pct ?? 0,
            );
          }
        }
      } catch { /* silent */ }
    }

    // simulation.complete — clear vehicle pin, show all-clear banner
    if (alert.event_type === 'simulation.complete') {
      mapRef.current?.clearVehicle?.();
    }

    // NOTE: disasterStore.addAlert() is called by wsService for EVERY event
    // before handlers.forEach() fires. No need to call it again here.
    // Just update the badge count from the store (which was already updated).
    setAlertCount(disasterStore.unreadCount);

    // ERT-specific events — store already updated by wsService dispatch
    if (isResponder) {
      // No loadDisasters() needed — disasterStore subscription handles re-render
      if (alert.event_type === 'coordination.escalation') {
        // Escalation — always show persistent banner, never auto-dismiss
        setActiveAlert(alert);
        return;
      }
      // Evacuation triggered — show evacuation status panel for ERT
      if (alert.event_type === 'evacuation.triggered') {
        Alert.alert(
          '🚨 EVACUATION ACTIVATED',
          alert.message ?? 'An evacuation plan has been activated for an active disaster.',
          [
            { text: 'View Plans', onPress: () => navigation.navigate('EvacuationPlans' as any) },
            { text: 'OK' },
          ],
        );
      }
      // Backup requested — prompt additional dispatch for ERT
      if (alert.event_type === 'disaster.backup_requested') {
        Alert.alert(
          '🆘 BACKUP REQUESTED',
          `${alert.title}\n\n${alert.message}`,
          [
            { text: 'View Missions', onPress: () => navigation.navigate('ActiveMissions' as any) },
            { text: 'OK' },
          ],
        );
      }
    }

    // Citizen events — shown to everyone
    const CITIZEN_BANNER_EVENTS = [
      'disaster.evaluated', 'reroute.triggered', 'evacuation.triggered',
      'disaster.verified', 'disaster.resolved', 'disaster.false_alarm',
      'disaster.cleared', 'route.updated', 'simulation.complete',
    ];

    // Responder-only events — only show banner to responders
    const RESPONDER_BANNER_EVENTS = [
      'disaster.dispatched', 'disaster.updated', 'disaster.unit_completed',
      'coordination.team_assigned', 'coordination.escalation',
    ];

    const shouldShowBanner =
      CITIZEN_BANNER_EVENTS.includes(alert.event_type) ||
      (isResponder && RESPONDER_BANNER_EVENTS.includes(alert.event_type));

    if (shouldShowBanner) {
      setActiveAlert(alert);
      if (alert.severity === 'LOW' || alert.severity === 'INFO') {
        setTimeout(() => setActiveAlert(prev => prev === alert ? null : prev), 5000);
      }
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    if (filterId !== 'all') {
      const match = disasters.filter(d => d.type === filterId);
      if (match.length > 0) {
        mapRef.current?.flyToDisaster?.(match[0]);
      }
    }
  };

  const handleMenuNavigate = (screen: string) => {
    setMenuVisible(false);
    setTimeout(() => navigation.navigate(screen as any), 300);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    setTimeout(() => {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
          },
        },
      ]);
    }, 300);
  };

  return (
    <>
      <MapTemplate
        header={
          <MapHeader
            location="Dublin, Ireland"
            notificationCount={notificationCount}
            userInitials={userInitials}
            avatarColor={isResponder ? '#DC2626' : undefined}
            onMenuPress={() => setMenuVisible(true)}
            onNotificationPress={() => navigation.navigate('Alerts' as any)}
            onAvatarPress={() => navigation.navigate('Profile' as any)}
          />
        }
        filterBar={
          <FilterTabs
            filters={FILTERS}
            selected={selectedFilter}
            onSelect={handleFilterSelect}
          />
        }
        map={
          <DisasterMap
            ref={mapRef}
            disasters={filteredDisasters}
            loading={loading}
            onReport={isResponder ? undefined : () => navigation.navigate('ReportDisaster' as any)}
            onViewDetails={(disasterId) =>
              isResponder
                ? navigation.navigate('DisasterDetail' as any, { disasterId })
                : navigation.navigate('DisasterAlertDetail' as any, { disasterId })
            }
            hideSearch={isResponder}
            isResponder={isResponder}
            selectedFilter={selectedFilter}
          />
        }
      />

      {/* WS Alert Banner */}
      {activeAlert && (
        <TouchableOpacity
          activeOpacity={pendingReroute ? 0.75 : 1}
          onPress={pendingReroute ? handleRerouteBannerTap : undefined}
          style={[styles.alertBanner, {
            backgroundColor: SEVERITY_BG[activeAlert.severity] ?? '#1F2937',
            paddingTop: insets.top + 12,  // respect safe area (notch/status bar)
          }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.alertBannerTitle}>{activeAlert.title}</Text>
            <Text style={styles.alertBannerMsg} numberOfLines={2}>{activeAlert.message}</Text>
            {pendingReroute && (
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 3 }}>
                Tap to view your detour on the map
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => { setActiveAlert(null); setPendingReroute(null); }} style={styles.alertDismiss}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── Clear Route button — citizen or responder ── */}
      {(responderRouteActive || citizenRouteActive) && (
        <TouchableOpacity
          style={styles.clearRouteBtn}
          onPress={() => {
            mapRef.current?.clearReroute?.();
            setResponderRouteActive(false);
            setCitizenRouteActive(false);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.clearRouteBtnText}>✕  Clear Route</Text>
        </TouchableOpacity>
      )}

      {/* ── Disaster load error — retry banner ── */}
      {loadError && !loading && (
        <TouchableOpacity
          style={[styles.clearRouteBtn, { backgroundColor: '#DC2626', bottom: (responderRouteActive || citizenRouteActive) ? 80 : 24 }]}
          onPress={() => { setLoadError(false); setLoading(true); loadDisasters(); }}
          activeOpacity={0.85}
        >
          <Text style={styles.clearRouteBtnText}>⚠️  Failed to load disasters — Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* ── Location permission denied banner (citizen only) ── */}
      {!isResponder && locationDenied && (
        <View style={[styles.clearRouteBtn, { backgroundColor: '#92400E', bottom: loadError ? 136 : 24, paddingVertical: 10 }]}>
          <Text style={[styles.clearRouteBtnText, { fontSize: 12 }]}>
            📍 Location access denied — alerts may not be geo-targeted to your area
          </Text>
        </View>
      )}

      {/* ── Left slide drawer using original working Modal + fade ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          {/* stopPropagation so tapping inside the drawer doesn't close it */}
          <TouchableOpacity
            style={styles.drawerContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            {isResponder && responderData ? (
              <ResponderProfileMenu
                name={responderData.full_name ?? userName}
                email={responderData.email ?? ''}
                role={responderData.role ?? 'staff'}
                department={responderData.department ?? 'fire'}
                employeeId={responderData.employee_id}
                initials={userInitials}
                missionCount={missionCount}
                onNavigate={handleMenuNavigate}
                onLogout={handleLogout}
              />
            ) : (
              <ProfileMenu
                name={userName}
                phone={userPhone}
                role="Citizen"
                initials={userInitials}
                alertCount={alertCount}
                onNavigate={handleMenuNavigate}
                onLogout={handleLogout}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: '#DC2626', HIGH: '#F97316', MEDIUM: '#D97706', LOW: '#2563EB', INFO: '#16A34A',
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  drawerContainer: {
    width: '82%',
    height: '100%',
    backgroundColor: colors.white,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
  },
  alertBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 14,
    zIndex: 999,
  },
  alertBannerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  alertBannerMsg:   { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  alertDismiss:     { paddingLeft: 12, paddingVertical: 4 },
  clearRouteBtn: {
    position:        'absolute',
    bottom:          32,
    alignSelf:       'center',
    backgroundColor: '#DC2626',
    borderRadius:    24,
    paddingVertical: 10,
    paddingHorizontal: 22,
    zIndex:          990,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       6,
  },
  clearRouteBtnText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   14,
  },
});

export default HomeScreen;