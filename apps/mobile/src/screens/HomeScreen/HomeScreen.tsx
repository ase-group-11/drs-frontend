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
import { mapService }  from '@services/mapService';
import { authService, authRequest } from '@services/authService';
import { wsService, WSAlert } from '@services/wsService';
import { notificationStore } from '@services/notificationStore';
import { colors }      from '@theme/colors';
import type { Disaster, DisasterFilter } from '../../types/disaster';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
interface HomeScreenProps { navigation: HomeScreenNavigationProp; route?: any; }

const FILTERS: DisasterFilter[] = [
  { id: 'all',       label: '📍 All',        icon: '📍' },
  { id: 'fire',      label: '🔥 Fire',       icon: '🔥', type: 'fire' },
  { id: 'flood',     label: '🌊 Flood',      icon: '🌊', type: 'flood' },
  { id: 'storm',     label: '⛈️ Storm',      icon: '⛈️', type: 'storm' },
  { id: 'earthquake',label: '🏚️ Earthquake', icon: '🏚️', type: 'earthquake' },
  { id: 'hurricane', label: '🌀 Hurricane',  icon: '🌀', type: 'hurricane' },
  { id: 'tsunami',   label: '🌊 Tsunami',    icon: '🌊', type: 'tsunami' },
  { id: 'heatwave',  label: '🌡️ Heatwave',   icon: '🌡️', type: 'heatwave' },
  { id: 'other',     label: '⚠️ Other',      icon: '⚠️', type: 'other' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const [disasters, setDisasters]                 = useState<Disaster[]>([]);
  const [filteredDisasters, setFilteredDisasters] = useState<Disaster[]>([]);
  const [selectedFilter, setSelectedFilter]       = useState('all');
  const [loading, setLoading]                     = useState(true);
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
  const [missionCount, setMissionCount]           = useState(0);
  const mapRef      = useRef<any>(null);
  const pendingNav  = useRef<{ lat: number; lon: number; label: string } | null>(null);

  // Store params immediately when they arrive (before screen is focused)
  useEffect(() => {
    const params = route?.params as any;
    if (params?.flyToLat && params?.flyToLon) {
      console.log('[HomeScreen] Storing pending nav params:', params.flyToLat, params.flyToLon);
      pendingNav.current = {
        lat:   params.flyToLat,
        lon:   params.flyToLon,
        label: params.flyToLabel ?? 'Incident Location',
      };
    }
    // Reroute from AlertsScreen: geometry already fetched, just apply to map
    if (params?.reroutePts && params.reroutePts.length > 1) {
      console.log('[HomeScreen] Received reroutePts from AlertsScreen:', params.reroutePts.length);
      setTimeout(() => {
        if (mapRef.current?.applyRerouteAlertWithGeometry) {
          mapRef.current.applyRerouteAlertWithGeometry(
            params.rerouteDisaster ?? '',
            params.reroutePts,
            params.rerouteMeta ?? null,
          );
        }
      }, 800);
    }
  }, [route?.params]);

  // Fire navigation when screen comes into focus AND map ref is ready
  useFocusEffect(useCallback(() => {
    if (!pendingNav.current) return;
    const nav = pendingNav.current;
    pendingNav.current = null;
    // Longer delay — map needs time after screen transition to be interactive
    const t = setTimeout(() => {
      console.log('[HomeScreen] useFocusEffect firing navigateToScene, mapRef:', !!mapRef.current);
      if (mapRef.current?.navigateToScene) {
        mapRef.current.navigateToScene(nav.lat, nav.lon, nav.label);
      } else {
        console.warn('[HomeScreen] mapRef.current.navigateToScene not available');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, []));

  useEffect(() => {
    loadDisasters();
    loadUserData();
    loadAlertCount();
    const interval = setInterval(() => { loadDisasters(); loadAlertCount(); }, 30000);

    // Connect WebSocket for real-time alerts
    const connectWS = async () => {
      const role = await AsyncStorage.getItem('@auth/user_role');
      wsService.connect(role === 'responder');
    };
    connectWS();

    const unsubAlert   = wsService.onAlert(handleWSAlert);
    const unsubConnect = wsService.onConnect(setWsConnected);
    const unsubStore   = notificationStore.subscribe(notifications => {
      setAlertCount(notifications.filter(n => !n.isRead).length);
    });

    return () => {
      clearInterval(interval);
      unsubAlert();
      unsubConnect();
      unsubStore();
      wsService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredDisasters(disasters);
    } else {
      setFilteredDisasters(disasters.filter(d => d.type === selectedFilter));
    }
  }, [selectedFilter, disasters]);

  const loadAlertCount = async () => {
    const count = await notificationStore.unreadCount();
    setAlertCount(count);
  };

  const loadDisasters = async () => {
    try {
      const bounds = mapService.formatBounds(53.20, -6.45, 53.45, -6.05);
      // ERT doc Section 11: responders use GET /live-map/data (richer combined data)
      // Citizens use GET /live-map/disasters
      const data = await mapService.getDisasters(bounds, 100);
      setDisasters(data);
      console.log('[HomeScreen] Disasters loaded:', data?.length ?? 0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load disasters:', error);
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
          const unitsData = await authRequest('/emergency-units/');
          const units: any[] = unitsData?.units ?? [];
          const userDept = (user.department ?? '').toUpperCase();
          const myUnit = units.find((u: any) => u.department?.toUpperCase() === userDept) ?? units[0];
          if (myUnit?.id) {
            const data = await authRequest(`/deployments/unit/${myUnit.id}/active`);
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
        const routeData = await authRequest<any>(`/reroute/status/${disasterId}/route/${routeId}`);
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
    // Refresh disaster map on relevant events
    if (['disaster.evaluated', 'disaster.verified', 'disaster.resolved', 'disaster.false_alarm'].includes(alert.event_type)) {
      loadDisasters();
    }

    // disaster.cleared — roads reopened, clear reroute overlay and status
    if (alert.event_type === 'disaster.cleared') {
      mapRef.current?.clearReroute?.();
    }

    // Citizen reroute — citizen-integration.md Section 8
    if (alert.event_type === 'reroute.triggered') {
      const data = alert.data ?? {};
      const disasterId = data.disaster_id as string;
      const routeAssignments: Record<string,string> = data.route_assignments ?? {};
      // routes[] in the WS payload already has time/dist metadata
      const routes: any[] = data.routes ?? [];

      // Always store in notification inbox (geometry added below after fetch)
      await notificationStore.add(alert);
      setAlertCount(await notificationStore.unreadCount());

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
          const routeData = await authRequest<any>(`/reroute/status/${disasterId}/route/${userRouteId}`);
          cachedPts = (routeData?.points ?? []).map(
            (p: number[]) => [p[1], p[0]] as [number, number]
          );
          console.log('[Reroute] Geometry pre-fetched:', cachedPts.length, 'points');
          // Update the stored notification with cached geometry so AlertsScreen can use it
          const all = await notificationStore.getAll();
          const idx = all.findIndex(n => n.timestamp === alert.timestamp);
          if (idx !== -1) {
            all[idx].cachedRoutePts  = cachedPts ?? undefined;
            all[idx].cachedRouteMeta = routeMeta
              ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters }
              : null;
            await AsyncStorage.setItem('@notifications/alerts', JSON.stringify(all));
          }
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

      await notificationStore.add(alert);
      setAlertCount(await notificationStore.unreadCount());

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
          const routeData = await authRequest<any>(`/reroute/status/${disasterId}/route/${userRouteId}`);
          cachedPts = (routeData?.points ?? []).map((p: number[]) => [p[1], p[0]] as [number, number]);
          console.log('[route.updated] New geometry:', cachedPts.length, 'pts');
          const all = await notificationStore.getAll();
          const idx = all.findIndex(n => n.timestamp === alert.timestamp);
          if (idx !== -1) {
            all[idx].cachedRoutePts  = cachedPts ?? undefined;
            all[idx].cachedRouteMeta = routeMeta ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters } : null;
            await AsyncStorage.setItem('@notifications/alerts', JSON.stringify(all));
          }
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

    // Store ALL alerts in notification inbox — AlertsScreen reads from here
    await notificationStore.add(alert);
    const unread = await notificationStore.unreadCount();
    setAlertCount(unread);

    // ERT-specific events — refreshMap and show urgent alert if responder
    if (isResponder) {
      if (['disaster.dispatched', 'disaster.updated', 'disaster.unit_completed',
           'coordination.team_assigned'].includes(alert.event_type)) {
        loadDisasters();
      }
      if (alert.event_type === 'coordination.escalation') {
        // Escalation — always show persistent banner, never auto-dismiss
        setActiveAlert(alert);
        return;
      }
    }

    // Show banner for important alerts
    if (['disaster.evaluated', 'reroute.triggered', 'evacuation.triggered', 'disaster.backup_requested',
         'disaster.verified', 'disaster.resolved', 'disaster.false_alarm', 'disaster.cleared',
         'route.updated', 'simulation.complete',
         // ERT extras
         'disaster.dispatched', 'disaster.updated', 'disaster.unit_completed',
         'coordination.team_assigned', 'coordination.escalation'].includes(alert.event_type)) {
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
            onReport={() => navigation.navigate('ReportDisaster' as any)}
            selectedFilter={selectedFilter}
          />
        }
      />

      {/* WS Alert Banner */}
      {activeAlert && (
        <TouchableOpacity
          activeOpacity={pendingReroute ? 0.75 : 1}
          onPress={pendingReroute ? handleRerouteBannerTap : undefined}
          style={[styles.alertBanner, { backgroundColor: SEVERITY_BG[activeAlert.severity] ?? '#1F2937' }]}
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
    padding: 14, paddingTop: 18,
    zIndex: 999,
  },
  alertBannerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  alertBannerMsg:   { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  alertDismiss:     { paddingLeft: 12, paddingVertical: 4 },
});

export default HomeScreen;