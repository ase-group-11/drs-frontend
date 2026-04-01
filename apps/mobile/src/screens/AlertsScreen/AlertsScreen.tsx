// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/AlertsScreen/AlertsScreen.tsx
//
// Citizen notification inbox — shows all WS push notifications received.
// Data comes from notificationStore (persisted AsyncStorage).
// No API calls — this is a pure notification history screen.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { notificationStore, StoredNotification } from '@services/notificationStore';
import { authRequest } from '@services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Severity colours from citizen-integration.md Section 10 ──────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#3b82f6',
  INFO:     '#22c55e',
};

const EVENT_ICON: Record<string, string> = {
  'disaster.evaluated':    '⚠️',
  'disaster.verified':     '✅',
  'disaster.resolved':     '🏁',
  'disaster.false_alarm':  '❌',
  'reroute.triggered':     '🔀',
  'route.updated':         '🛣️',
  'disaster.cleared':      '✅',
  'vehicle.location_updated': '🚗',
  'simulation.complete':   '🏁',
  'evacuation.triggered':  '🚨',
};

const EVENT_LABEL: Record<string, string> = {
  'disaster.evaluated':    'New Disaster Alert',
  'disaster.verified':     'Emergency Confirmed',
  'disaster.resolved':     'Incident Resolved',
  'disaster.false_alarm':  'False Alarm',
  'reroute.triggered':     'Route Affected',
  'route.updated':         'Route Updated',
  'disaster.cleared':      'Roads Cleared',
  'vehicle.location_updated': 'Vehicle Update',
  'simulation.complete':   'Simulation Complete',
  'evacuation.triggered':  'Evacuation Alert',
};

const getTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [refreshing, setRefreshing]        = useState(false);
  const [tab, setTab]                      = useState<'all'|'critical'|'info'>('all');

  useEffect(() => {
    // Load from store on mount
    load();
    // Subscribe to real-time changes (new notifications arrive while screen is open)
    const unsub = notificationStore.subscribe(setNotifications);
    // Mark all as read when screen opens
    notificationStore.markAllRead();
    return () => unsub();
  }, []);

  const load = async () => {
    const all = await notificationStore.getAll();
    setNotifications(all);
    await notificationStore.markAllRead();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = notifications.filter(n => {
    if (tab === 'critical') {
      return n.severity === 'CRITICAL' || n.severity === 'HIGH';
    }
    if (tab === 'info') {
      return n.severity === 'INFO' || n.severity === 'LOW' ||
             ['disaster.resolved', 'disaster.cleared', 'disaster.false_alarm'].includes(n.event_type);
    }
    return true;
  });

  const critCount = notifications.filter(n => n.severity === 'CRITICAL' || n.severity === 'HIGH').length;

  const handleAlertPress = async (item: StoredNotification) => {
    // Mark read
    await notificationStore.markRead(item.timestamp);
    load();

    // reroute.triggered: use cached geometry (pre-fetched when alert arrived)
    if (item.event_type === 'reroute.triggered' || item.event_type === 'route.updated') {
      const data = item.data ?? {};
      const disasterId = data.disaster_id as string;

      // Use cached geometry stored when alert first arrived — avoids 404 on expired plans
      if (item.cachedRoutePts && item.cachedRoutePts.length > 1) {
        console.log('[AlertsScreen] Using cached geometry:', item.cachedRoutePts.length, 'pts');
        navigation.navigate('Home' as any, {
          reroutePts:      item.cachedRoutePts,
          rerouteDisaster: disasterId,
          rerouteMeta:     item.cachedRouteMeta ?? null,
        });
        return;
      }

      // Fallback: try live fetch (only works if plan still active)
      const routeAssignments: Record<string, string> = data.route_assignments ?? {};
      const routes: any[] = data.routes ?? [];
      try {
        const stored = await AsyncStorage.getItem('@auth/user_data');
        const user = stored ? JSON.parse(stored) : null;
        const routeId = user ? routeAssignments[user.id] : null;
        if (!routeId) { navigation.navigate('Home' as any); return; }

        console.log('[AlertsScreen] No cache, fetching live geometry:', disasterId, routeId);
        const routeData = await authRequest<any>(`/reroute/status/${disasterId}/route/${routeId}`);
        const pts: [number, number][] = (routeData?.points ?? []).map(
          (p: number[]) => [p[1], p[0]] as [number, number]
        );
        const routeMeta = routes.find((r: any) => r.route_id === routeId);
        navigation.navigate('Home' as any, {
          reroutePts:      pts,
          rerouteDisaster: disasterId,
          rerouteMeta:     routeMeta
            ? { time: routeMeta.travel_time_seconds, dist: routeMeta.length_meters }
            : null,
        });
      } catch (e: any) {
        console.error('[AlertsScreen] Reroute fetch failed:', e.message);
        navigation.navigate('Home' as any);
      }
      return;
    }

    // disaster.evaluated / verified: go to map (disaster marker already drawn)
    if (['disaster.evaluated', 'disaster.verified', 'disaster.backup_requested',
         'evacuation.triggered'].includes(item.event_type)) {
      navigation.navigate('Home' as any);
    }
  };

  const renderItem = ({ item }: { item: StoredNotification }) => {
    const colour    = SEV_COLOR[item.severity] ?? '#6B7280';
    const icon      = EVENT_ICON[item.event_type] ?? '📋';
    const label     = EVENT_LABEL[item.event_type] ?? item.event_type.replace(/\./g, ' ');
    const tappable  = ['reroute.triggered', 'route.updated', 'disaster.evaluated',
                       'disaster.verified', 'disaster.backup_requested',
                       'evacuation.triggered'].includes(item.event_type);

    return (
      <TouchableOpacity
        style={[S.card, !item.isRead && S.cardUnread, { borderLeftColor: colour }]}
        onPress={() => handleAlertPress(item)}
        activeOpacity={tappable ? 0.75 : 1}
      >
        {!item.isRead && <View style={[S.unreadDot, { backgroundColor: colour }]} />}

        <View style={S.cardTop}>
          <View style={[S.iconCircle, { backgroundColor: colour + '18' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={S.cardTitleRow}>
              <Text style={S.cardLabel}>{label}</Text>
              <View style={[S.sevPill, { backgroundColor: colour + '20' }]}>
                <Text style={[S.sevTxt, { color: colour }]}>{item.severity}</Text>
              </View>
            </View>
            <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
          </View>
        </View>

        <Text style={S.cardMessage} numberOfLines={3}>{item.message}</Text>

        <Text style={S.cardTime}>{getTimeAgo(item.storedAt ?? item.timestamp)}</Text>
        {tappable && (
          <Text style={S.tapHint}>
            {['reroute.triggered', 'route.updated'].includes(item.event_type)
              ? 'Tap to view route on map'
              : 'Tap to open map'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4">Active Alerts</Text>
        <TouchableOpacity
          style={S.hBtn}
          onPress={async () => { await notificationStore.clear(); setNotifications([]); }}
        >
          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {[
          { key: 'all',      label: 'All',      count: notifications.length },
          { key: 'critical', label: 'Critical',  count: critCount },
          { key: 'info',     label: 'Updates',   count: notifications.length - critCount },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, tab === t.key && S.tabActive]}
            onPress={() => setTab(t.key as any)}
          >
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.timestamp + i}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={S.emptyTitle}>No Notifications Yet</Text>
            <Text style={S.emptySub}>
              Real-time alerts from the Emergency Response System will appear here as they arrive.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  tabs: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab:       { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabTxt:    { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  tabTxtActive: { color: colors.primary, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  cardUnread: { backgroundColor: '#FAFCFF' },
  unreadDot: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 8, height: 8, borderRadius: 4,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  iconCircle:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  cardLabel:    { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' },
  sevPill:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sevTxt:       { fontSize: 10, fontWeight: '800' },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: '#1F2937', lineHeight: 20 },
  cardMessage:  { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: spacing.xs },
  cardTime:     { fontSize: 11, color: '#9CA3AF' },
  tapHint:     { fontSize: 11, color: '#3B82F6', marginTop: 5, fontWeight: '600' },

  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: spacing.md },
  emptySub:   { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});

export default AlertsScreen;