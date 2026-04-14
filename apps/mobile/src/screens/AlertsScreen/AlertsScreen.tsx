// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/AlertsScreen/AlertsScreen.tsx
//
// Alerts inbox from WS events.
// Tap behaviour now routes intelligently based on event_type:
//   • disaster.*          → DisasterDetail (if disaster_id available)
//   • reroute.triggered   → Home map with reroute geometry applied
//   • route.updated       → Home map with updated reroute geometry
//   • evacuation.*        → EvacuationPlans screen
//   • coordination.*      → DisasterCommand screen
//   • Other               → marks as read (no navigation)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useNavigation }   from '@react-navigation/native';
import { Text }            from '@atoms/Text';
import { colors }          from '@theme/colors';
import { spacing }         from '@theme/spacing';
import Svg, { Path }       from 'react-native-svg';
import { disasterStore, SEVERITY_COLOR, COLOUR_MAP } from '@services/disasterStore';
import type { StoredAlert }   from '@services/disasterStore';
import { notificationStore }  from '@services/notificationStore';
import { authRequest }        from '@services/authService';
import { API }                from '@services/apiConfig';
import AsyncStorage            from '@react-native-async-storage/async-storage';
import { formatTimeAgo }   from '@utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatTime = formatTimeAgo;

// Human-readable labels for event types shown in the card badge
const EVENT_LABEL: Record<string, string> = {
  'disaster.evaluated':      'New Disaster',
  'disaster.verified':       'Verified',
  'disaster.dispatched':     'Dispatched',
  'disaster.updated':        'Updated',
  'disaster.resolved':       'Resolved',
  'disaster.false_alarm':    'False Alarm',
  'disaster.cleared':        'Cleared',
  'disaster.backup_requested': 'Backup',
  'disaster.unit_completed': 'Unit Done',
  'reroute.triggered':       'Reroute',
  'route.updated':           'Route Change',
  'evacuation.triggered':    'Evacuation',
  'coordination.team_assigned': 'Assigned',
  'coordination.escalation': 'Escalation',
  'vehicle.location_updated': 'Vehicle',
  'simulation.complete':     'Simulation',
};

// Icons shown next to event_type badge
const EVENT_ICON: Record<string, string> = {
  'disaster.evaluated':     '🔴',
  'disaster.verified':      '✅',
  'disaster.dispatched':    '🚒',
  'disaster.updated':       '📋',
  'disaster.resolved':      '✅',
  'disaster.false_alarm':   '🔕',
  'disaster.cleared':       '🟢',
  'disaster.backup_requested': '🆘',
  'reroute.triggered':      '🗺️',
  'route.updated':          '🔄',
  'evacuation.triggered':   '🚨',
  'coordination.team_assigned': '👥',
  'coordination.escalation': '⬆️',
  'vehicle.location_updated': '🚗',
  'simulation.complete':    '✓',
};

// Determine whether this alert can navigate somewhere
const getNavHint = (alert: StoredAlert): string | null => {
  const et = alert.event_type;
  const disasterId = alert.data?.disaster_id ?? alert.data?.id;

  if (et.startsWith('disaster.') && disasterId)        return 'Tap to view disaster →';
  if (et === 'reroute.triggered' || et === 'route.updated') return 'Tap to view on map →';
  if (et.startsWith('evacuation.'))                    return 'Tap to view evacuation plans →';
  if (et.startsWith('coordination.'))                  return 'Tap to view command →';
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [, forceRender] = useState(0);
  const [role, setRole] = useState<string | null>(null); // null = not yet read

  useEffect(() => {
    disasterStore.loadPersistedAlerts();
    // Read stored role — hide Clear All only for confirmed responders
    AsyncStorage.getItem('@auth/user_role').then(r => setRole(r));
    const unsub = disasterStore.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, []);

  const alerts = disasterStore.getState().alerts;
  const unread  = alerts.filter(a => !a.isRead).length;

  const getColor = (a: StoredAlert): string => {
    if (a.colour && COLOUR_MAP[a.colour]) return COLOUR_MAP[a.colour];
    return SEVERITY_COLOR[a.severity] ?? '#6B7280';
  };

  // ── Smart tap handler — role-aware ───────────────────────────────────────
  const handleTap = async (alert: StoredAlert) => {
    if (!alert.isRead) disasterStore.markAlertRead(alert.id);

    const et         = alert.event_type;
    const data       = alert.data ?? {};
    const disasterId = data.disaster_id ?? data.id;
    const isCitizen  = role !== 'responder';

    // ── Disaster events ────────────────────────────────────────────────────
    if (et.startsWith('disaster.')) {

      // disaster.cleared → show map (roads reopened) — both roles
      if (et === 'disaster.cleared') {
        navigation.navigate('Home' as any);
        return;
      }

      // Responder-specific routing
      if (!isCitizen) {
        // Dispatched / backup_requested → open ActiveMissions (they need to act)
        if (et === 'disaster.dispatched' || et === 'disaster.backup_requested') {
          navigation.navigate('ActiveMissions' as any);
          return;
        }
        // Unit completed → open CompletedMissions
        if (et === 'disaster.unit_completed') {
          navigation.navigate('CompletedMissions' as any);
          return;
        }
        // All other disaster events → full detail screen
        if (disasterId) {
          navigation.navigate('DisasterDetail' as any, { disasterId });
        }
        return;
      }

      // Citizen disaster events → DisasterAlertDetail
      if (disasterId) {
        navigation.navigate('DisasterAlertDetail' as any, { disasterId, alert });
      }
      return;
    }

    // ── Reroute / route.updated ────────────────────────────────────────────
    // Citizens: look up pre-fetched geometry from notificationStore and pass
    // to HomeScreen so it can draw the route without a potentially-expired API call.
    // Responders: open DisasterDetail to manage the disaster.
    if (et === 'reroute.triggered' || et === 'route.updated') {
      if (isCitizen) {
        // Look up cached geometry stored by HomeScreen when the WS event first arrived
        const stored = await notificationStore.getAll();
        const match  = stored.find(n => n.timestamp === alert.timestamp);

        if (match?.cachedRoutePts && match.cachedRoutePts.length > 1) {
          navigation.navigate('Home' as any, {
            reroutePts:      match.cachedRoutePts,
            rerouteMeta:     match.cachedRouteMeta ?? null,
            rerouteDisaster: disasterId ?? '',
          });
        } else {
          // Cached geometry missing — try live fetch as fallback
          try {
            const storedUser = await AsyncStorage.getItem('@auth/user_data');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const routeAssignments = alert.data?.route_assignments ?? {};
            const routeId = user?.id ? routeAssignments[user.id] : null;

            if (routeId && disasterId) {
              const routeData = await authRequest<any>(
                API.reroute.status(disasterId, routeId)
              );
              const pts: [number, number][] = (routeData?.points ?? []).map(
                (p: number[]) => [p[1], p[0]] as [number, number]
              );
              const meta = routeData?.travel_time_seconds
                ? { time: routeData.travel_time_seconds, dist: routeData.length_meters ?? 0 }
                : null;
              if (pts.length > 1) {
                navigation.navigate('Home' as any, {
                  reroutePts: pts, rerouteMeta: meta, rerouteDisaster: disasterId,
                });
                return;
              }
            }
          } catch {
            // Plan expired — just open map, WS overlay may still be drawn
          }
          navigation.navigate('Home' as any, { routeUnavailable: true });
        }
      } else if (disasterId) {
        navigation.navigate('DisasterDetail' as any, { disasterId });
      }
      return;
    }

    // ── Evacuation → EvacuationPlans ──────────────────────────────────────
    // Both roles — citizens need to evacuate, responders manage the plan
    if (et.startsWith('evacuation.')) {
      navigation.navigate('EvacuationPlans' as any, disasterId ? { disasterId } : undefined);
      return;
    }

    // ── Coordination events ────────────────────────────────────────────────
    if (et.startsWith('coordination.')) {
      if (isCitizen) {
        // Citizens have no command screen — show disaster detail if available
        if (disasterId) {
          navigation.navigate('DisasterAlertDetail' as any, { disasterId });
        }
      } else {
        navigation.navigate('DisasterCommand' as any);
      }
      return;
    }

    // All other events (vehicle.location_updated, simulation.complete, etc.)
    // Already marked as read above — no navigation needed
  };


  const handleClearAll = () => {
    Alert.alert('Clear All Alerts', 'Remove all alerts from your inbox?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => disasterStore.clearAlerts() },
    ]);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7"
              stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Alerts</Text>
          {unread > 0 && (
            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
              {unread} unread
            </Text>
          )}
        </View>

        <TouchableOpacity style={S.hBtn} onPress={() => disasterStore.markAllAlertsRead()}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Read All</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {alerts.length === 0 ? (
          <View style={S.empty}>
            <Text style={{ fontSize: 52, lineHeight: 66 }}>🔔</Text>
            <Text style={S.emptyTitle}>No alerts yet</Text>
            <Text style={S.emptyBody}>
              Real-time WebSocket events will appear here as they come in.
            </Text>
          </View>
        ) : (
          <View>
            {alerts.map((alert, i) => {
              const col     = getColor(alert);
              const navHint = getNavHint(alert);
              const label   = EVENT_LABEL[alert.event_type] ?? alert.event_type;
              const icon    = EVENT_ICON[alert.event_type] ?? '📢';

              return (
                <TouchableOpacity
                  key={alert.id ?? `alert-${i}`}
                  style={[S.card, { borderLeftColor: col }, !alert.isRead && S.cardUnread]}
                  onPress={() => handleTap(alert)}
                  activeOpacity={navHint ? 0.75 : 0.95}
                >
                  {/* Top row: severity + event type + service + unread dot */}
                  <View style={S.topRow}>
                    <View style={[S.sevDot, { backgroundColor: col }]} />
                    <Text style={[S.sevLabel, { color: col }]}>{alert.severity}</Text>

                    <View style={[S.eventPill, { backgroundColor: col + '18' }]}>
                      <Text style={{ fontSize: 10, marginRight: 3 }}>{icon}</Text>
                      <Text style={[S.eventTxt, { color: col }]}>{label}</Text>
                    </View>

                    <Text style={S.serviceLabel} numberOfLines={1}>
                      {alert.service}
                    </Text>

                    {!alert.isRead && <View style={[S.unreadDot, { backgroundColor: col }]} />}
                  </View>

                  {/* Title */}
                  <Text style={S.alertTitle}>{alert.title}</Text>

                  {/* Message */}
                  <Text style={S.alertMsg} numberOfLines={3}>{alert.message}</Text>

                  {/* Footer: time + nav hint + read status */}
                  <View style={S.footer}>
                    <Text style={S.alertTime}>{formatTime(alert.timestamp)}</Text>
                    {navHint ? (
                      <Text style={[S.navHint, { color: col }]}>{navHint}</Text>
                    ) : alert.isRead ? (
                      <Text style={S.readLabel}>✓ Read</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Clear all — citizens only */}
            {role !== 'responder' && (
              <TouchableOpacity style={S.clearBtn} onPress={handleClearAll}>
                <Text style={S.clearBtnTxt}>🗑️  Clear All Alerts</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#F8FAFC' },
  header:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hBtn:       { width: 50, height: 40, justifyContent: 'center', alignItems: 'center' },

  empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyBody:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  card:       {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: { backgroundColor: '#FFFBEB' },

  topRow:     {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 8,
  },
  sevDot:     { width: 8, height: 8, borderRadius: 4 },
  sevLabel:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  eventPill:  {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  eventTxt:   { fontSize: 10, fontWeight: '700' },
  serviceLabel: {
    fontSize: 10, color: '#9CA3AF',
    marginLeft: 'auto', maxWidth: 80,
  },
  unreadDot:  { width: 8, height: 8, borderRadius: 4 },

  alertTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  alertMsg:   { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  footer:     {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  alertTime:  { fontSize: 11, color: '#9CA3AF' },
  navHint:    { fontSize: 11, fontWeight: '700' },
  readLabel:  { fontSize: 10, color: '#9CA3AF' },

  clearBtn:   {
    marginTop: 12, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
    backgroundColor: '#fff',
  },
  clearBtnTxt: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
});

export default AlertsScreen;