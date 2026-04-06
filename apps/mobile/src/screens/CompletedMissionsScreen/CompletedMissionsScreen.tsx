// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/CompletedMissionsScreen/CompletedMissionsScreen.tsx
//
// ERT-integration.md Section 8: GET /deployments/unit/{unit_id}/completed
// ERT-integration.md Section 7: GET /deployments/{deployment_id} (detail)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest, authService, getUserUnitInfo } from '@services/authService';

const RED = '#DC2626';

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#22C55E', CANCELLED: '#6B7280', IN_PROGRESS: '#F97316', ON_SCENE: '#EF4444',
};
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#3B82F6',
};

export const CompletedMissionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [missions, setMissions]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = await authService.getStoredUser() as any;
      if (!user?.id) { setLoading(false); setRefreshing(false); return; }

      // Get unit ID from /users/{user_id} API
      const { unitId } = await getUserUnitInfo();

      if (!unitId) { setMissions([]); setLoading(false); setRefreshing(false); return; }

      // GET /deployments/unit/{unit_id}/completed — ERT-integration.md Section 8
      const data = await authRequest<any>(`/deployments/unit/${unitId}/completed?limit=50`);
      const list: any[] = data?.missions ?? data?.deployments ?? (Array.isArray(data) ? data : []);
      setMissions(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load completed missions.');
      console.error('[CompletedMissions] Failed:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadDetail = async (deploymentId: string) => {
    setDetailLoading(true);
    try {
      // GET /deployments/{deployment_id} — ERT-integration.md Section 7
      const data = await authRequest<any>(`/deployments/${deploymentId}`);
      setSelected(data);
    } catch (e: any) {
      console.warn('[CompletedMissions] Detail failed:', e);
    }
    setDetailLoading(false);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (selected) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={S.safe}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={S.header}>
          <TouchableOpacity style={S.hBtn} onPress={() => setSelected(null)}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={S.headerTitle}>Mission Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        {detailLoading ? <ActivityIndicator size="large" color={RED} style={{ margin: 40 }} /> : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={S.card}>
              <Text style={S.cardTitle}>Deployment Summary</Text>
              <Text style={S.row}>Status: <Text style={S.val}>{selected.deployment_status ?? selected.status}</Text></Text>
              <Text style={S.row}>Priority: <Text style={S.val}>{selected.priority_level ?? '—'}</Text></Text>
              {selected.situation_report && <Text style={S.row}>Report: <Text style={S.val}>{selected.situation_report}</Text></Text>}
              {selected.minor_injuries > 0 && <Text style={S.row}>Minor injuries: <Text style={S.val}>{selected.minor_injuries}</Text></Text>}
              {selected.serious_injuries > 0 && <Text style={[S.val, { color: '#EF4444' }]}>Serious injuries: {selected.serious_injuries}</Text>}
            </View>
            {selected.disaster && (
              <View style={S.card}>
                <Text style={S.cardTitle}>Incident</Text>
                <Text style={S.row}>Type: <Text style={S.val}>{selected.disaster.type}</Text></Text>
                <Text style={S.row}>Location: <Text style={S.val}>{selected.disaster.location_address}</Text></Text>
                <Text style={S.row}>Severity: <Text style={[S.val, { color: SEV_COLOR[selected.disaster.severity] ?? '#6B7280' }]}>{selected.disaster.severity}</Text></Text>
              </View>
            )}
            {selected.timeline && (
              <View style={S.card}>
                <Text style={S.cardTitle}>Timeline</Text>
                {Object.entries(selected.timeline).map(([k, v]) => v ? (
                  <Text key={k} style={S.row}>{k.replace(/_/g, ' ')}: <Text style={S.val}>{formatDate(v as string)}</Text></Text>
                ) : null)}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Completed Missions</Text>
        <TouchableOpacity style={S.hBtn} onPress={() => { setRefreshing(true); load(); }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {!!error && !loading && (
        <View style={{ backgroundColor: '#FEE2E2', margin: 12, padding: 14,
                       borderRadius: 10, borderLeftWidth: 3, borderLeftColor: RED }}>
          <Text style={{ color: '#991B1B', fontSize: 13 }}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 6 }}>
            <Text style={{ color: RED, fontWeight: '700', fontSize: 13 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? <ActivityIndicator size="large" color={RED} style={{ margin: 40 }} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
          {missions.length === 0 ? (
            <View style={S.empty}>
              <Text style={{ fontSize: 40, lineHeight: 52 }}>📋</Text>
              <Text style={S.emptyTitle}>No completed missions</Text>
            </View>
          ) : missions.map((m, i) => {
            const d = m.disaster ?? {};
            const sev = (d.severity ?? '').toUpperCase();
            const col = SEV_COLOR[sev] ?? '#6B7280';
            const stCol = STATUS_COLOR[m.deployment_status ?? m.status] ?? '#6B7280';
            return (
              <TouchableOpacity key={m.deployment_id ?? m.id ?? i} style={S.card2}
                onPress={() => { loadDetail(m.deployment_id ?? m.id); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={[S.statusBadge, { backgroundColor: stCol }]}>
                    <Text style={S.statusTxt}>{m.deployment_status ?? m.status}</Text>
                  </View>
                  {sev ? <View style={[S.sevBadge, { backgroundColor: col + '20' }]}>
                    <Text style={[S.sevTxt, { color: col }]}>{sev}</Text>
                  </View> : null}
                </View>
                <Text style={S.mType}>{(d.type ?? 'Mission').replace(/_/g, ' ')}</Text>
                <Text style={S.mAddr}>{d.location_address ?? 'Location unknown'}</Text>
                <Text style={S.mDate}>{formatDate(m.timeline?.completed_at ?? m.updated_at)}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  row:  { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  val:  { color: '#1F2937', fontWeight: '600' },
  card2: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 12, marginBottom: 8,
           shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
  statusTxt:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  sevBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  sevTxt:      { fontSize: 10, fontWeight: '800' },
  mType: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
  mAddr: { fontSize: 13, color: '#6B7280' },
  mDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  empty: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 12 },
});

export default CompletedMissionsScreen;