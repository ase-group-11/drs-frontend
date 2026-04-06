// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/AlertsScreen/AlertsScreen.tsx
//
// Alerts from WS events. Tap = mark read. Read All / Clear All buttons.
// No expanded data view — just title, message, severity, timestamp.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { disasterStore, SEVERITY_COLOR, COLOUR_MAP } from '@services/disasterStore';
import type { StoredAlert } from '@services/disasterStore';

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [, forceRender] = useState(0);

  useEffect(() => {
    disasterStore.loadPersistedAlerts();
    const unsub = disasterStore.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, []);

  const alerts = disasterStore.getState().alerts;
  const unread = alerts.filter(a => !a.isRead).length;

  const getColor = (a: StoredAlert): string => {
    if (a.colour && COLOUR_MAP[a.colour]) return COLOUR_MAP[a.colour];
    return SEVERITY_COLOR[a.severity] ?? '#6B7280';
  };

  const handleTap = (alert: StoredAlert) => {
    if (!alert.isRead) disasterStore.markAlertRead(alert.id);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Alerts', 'Remove all alerts?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => disasterStore.clearAlerts() },
    ]);
  };

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Alerts</Text>
          {unread > 0 && <Text style={{ fontSize: 11, color: '#EF4444' }}>{unread} unread</Text>}
        </View>
        <TouchableOpacity style={S.hBtn} onPress={() => disasterStore.markAllAlertsRead()}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Read All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {alerts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 48, lineHeight: 62 }}>🔔</Text>
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 12 }}>No alerts yet</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
              WebSocket events will appear here in real-time.
            </Text>
          </View>
        ) : (
          <View>
            {alerts.map((alert, i) => {
              const col = getColor(alert);
              return (
                <TouchableOpacity
                  key={alert.id ?? `alert-${i}`}
                  style={[S.alertCard, { borderLeftColor: col }, !alert.isRead && S.unread]}
                  onPress={() => handleTap(alert)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <View style={[S.sevDot, { backgroundColor: col }]} />
                    <Text style={[S.sevLabel, { color: col }]}>{alert.severity}</Text>
                    <View style={S.eventPill}>
                      <Text style={S.eventTxt}>{alert.event_type}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' }}>{alert.service}</Text>
                    {!alert.isRead && <View style={[S.unreadDot, { backgroundColor: col }]} />}
                  </View>

                  <Text style={S.alertTitle}>{alert.title}</Text>
                  <Text style={S.alertMsg} numberOfLines={3}>{alert.message}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Text style={S.alertTime}>{formatTime(alert.timestamp)}</Text>
                    {alert.isRead && <Text style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 8 }}>✓ Read</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={S.clearBtn} onPress={handleClearAll}>
              <Text style={S.clearBtnTxt}>Clear All Alerts</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hBtn: { width: 50, height: 40, justifyContent: 'center', alignItems: 'center' },
  alertCard: {
    backgroundColor: '#fff', borderRadius: 12, borderLeftWidth: 4,
    padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  unread: { backgroundColor: '#FFFBEB' },
  sevDot: { width: 8, height: 8, borderRadius: 4 },
  sevLabel: { fontSize: 11, fontWeight: '800' },
  eventPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F3F4F6' },
  eventTxt: { fontSize: 10, fontWeight: '600', color: '#374151' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  alertMsg: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  alertTime: { fontSize: 11, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  clearBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  clearBtnTxt: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
});

export default AlertsScreen;