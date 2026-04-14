// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/DisasterCommandScreen/DisasterCommandScreen.tsx
// FIXED: Added loading state + error UI
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest } from '@services/authService';
import { API } from '@services/apiConfig';
import { disasterStore, SEVERITY_COLOR } from '@services/disasterStore';
import { formatTimeAgo } from '@utils/formatters';

const RED = '#DC2626';

const TYPE_EMOJI: Record<string, string> = {
  FLOOD: '🌊', FIRE: '🔥', EARTHQUAKE: '🏚️', HURRICANE: '🌀',
  TORNADO: '🌪️', TSUNAMI: '🌊', DROUGHT: '🏜️', HEATWAVE: '🌡️',
  COLDWAVE: '🧊', STORM: '⛈️', OTHER: '⚠️',
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: '#EF4444', VERIFIED: '#F97316', DISPATCHED: '#3B82F6',
  PENDING: '#EAB308', RESOLVED: '#22C55E', REJECTED: '#6B7280',
};

const formatAgo = formatTimeAgo;

export const DisasterCommandScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Subscribe to store
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = disasterStore.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, []);

  const { activeDisasters, resolvedDisasters } = disasterStore.getState();
  const allDisasters = [...activeDisasters, ...resolvedDisasters];

  const fetchDisasters = async () => {
    setError('');
    try {
      const data = await authRequest<any>(API.disasters.active());
      const list = data?.disasters ?? (Array.isArray(data) ? data : []);
      disasterStore.setActiveDisasters(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load disasters. Pull to refresh.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDisasters();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Disaster Command</Text>
        <TouchableOpacity style={S.hBtn} onPress={onRefresh} activeOpacity={0.7}>
          {refreshing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontSize: 20, lineHeight: 26 }}>↻</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ✅ Error banner */}
      {!!error && (
        <View style={S.errorBanner}>
          <Text style={S.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={S.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md }}
      >
        {allDisasters.length === 0 ? (
          <View style={S.empty}>
            <Text style={{ fontSize: 48, lineHeight: 62 }}>✅</Text>
            <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>
              No Active Disasters
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
              Disasters will appear here when reported.
            </Text>
          </View>
        ) : (
          <>
            <Text style={S.sectionLabel}>
              ALL DISASTERS ({allDisasters.length})
            </Text>

            {allDisasters.map(d => {
              const sev = (d.severity ?? 'LOW').toUpperCase();
              const col = SEVERITY_COLOR[sev] ?? '#6B7280';
              const isResolved = d.disaster_status === 'RESOLVED' || d.disaster_status === 'REJECTED';

              return (
                <TouchableOpacity
                  key={d.id}
                  style={[S.card, isResolved && { opacity: 0.55 }]}
                  onPress={() => navigation.navigate('DisasterDetail', { disasterId: d.id })}
                  activeOpacity={0.8}
                >
                  <View style={[S.sevBar, { backgroundColor: col }]} />

                  <Text style={{ fontSize: 28, lineHeight: 36, marginRight: 10 }}>
                    {TYPE_EMOJI[d.type] ?? '⚠️'}
                  </Text>

                  <View style={{ flex: 1 }}>
                    <View style={S.titleRow}>
                      <Text style={S.dtype}>
                        {(d.type ?? 'UNKNOWN').replace(/_/g, ' ')}
                      </Text>
                      <View style={[S.pill, { backgroundColor: col + '20' }]}>
                        <Text style={[S.pillTxt, { color: col }]}>{sev}</Text>
                      </View>
                      {d._falseAlarm && (
                        <View style={S.falseBadge}>
                          <Text style={S.falseTxt}>FALSE ALARM</Text>
                        </View>
                      )}
                    </View>

                    <Text style={S.addr}>{d.location_address}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                      <Text style={S.meta}>{d.tracking_id}</Text>
                      {d.people_affected > 0 && (
                        <Text style={S.meta}>· {d.people_affected} affected</Text>
                      )}
                      {d.created_at && (
                        <Text style={S.meta}>· {formatAgo(d.created_at)}</Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                      <View style={[S.statusDot, { backgroundColor: STATUS_DOT[d.disaster_status] ?? '#6B7280' }]} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: STATUS_DOT[d.disaster_status] ?? '#6B7280' }}>
                        {d.disaster_status}
                      </Text>
                      {d.assigned_department && (
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>· {d.assigned_department}</Text>
                      )}
                    </View>
                  </View>

                  <Text style={{ fontSize: 18, lineHeight: 24, color: '#9CA3AF' }}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEE2E2', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderLeftWidth: 3, borderLeftColor: RED },
  errorText:   { color: '#991B1B', fontSize: 13, flex: 1 },
  retryText:   { color: RED, fontWeight: '700', fontSize: 13, marginLeft: spacing.md },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sevBar:      { width: 4, height: '100%' as any, borderRadius: 2, marginRight: 10 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  dtype:       { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  pill:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  pillTxt:     { fontSize: 10, fontWeight: '800' },
  addr:        { fontSize: 13, color: '#6B7280' },
  meta:        { fontSize: 11, color: '#9CA3AF' },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  falseBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  falseTxt:    { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  empty:       { padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', marginTop: 20 },
});

export default DisasterCommandScreen;