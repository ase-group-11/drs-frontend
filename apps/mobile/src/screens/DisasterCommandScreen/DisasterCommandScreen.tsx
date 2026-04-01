// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/DisasterCommandScreen/DisasterCommandScreen.tsx
//
// ERT Command View — ERT-integration.md Sections 4, 9, 10
// APIs:
//   GET /disasters/active                      → all active disasters
//   GET /disasters/{id}                        → full disaster detail
//   GET /disasters/{id}/deployments            → deployments for disaster
//   GET /reroute/status/{disaster_id}          → reroute plan (command view)
//   GET /reroute/plans                         → all active reroute plans
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest } from '@services/authService';
import { wsService, WSAlert } from '@services/wsService';

const RED = '#DC2626';

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#3B82F6', INFO: '#22C55E',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#EF4444', VERIFIED: '#F97316', DISPATCHED: '#3B82F6',
  PENDING: '#EAB308', RESOLVED: '#22C55E', REJECTED: '#6B7280',
};
const TYPE_EMOJI: Record<string, string> = {
  FIRE: '🔥', FLOOD: '🌊', STORM: '⛈️', EARTHQUAKE: '🏚️',
  HURRICANE: '🌀', EXPLOSION: '💥', GAS_LEAK: '☁️', OTHER: '⚠️',
};

interface ActiveDisaster {
  id: string;
  tracking_id: string;
  type: string;
  severity: string;
  disaster_status: string;
  location_address: string;
  location: { lat: number; lon: number };
  people_affected: number;
  assigned_department?: string;
}

interface Deployment {
  id: string;
  deployment_status: string;
  priority_level: string;
  unit_name?: string;
  eta_minutes?: number;
  timeline?: { dispatched_at?: string; en_route_at?: string; on_scene_at?: string };
}

export const DisasterCommandScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [disasters, setDisasters]       = useState<ActiveDisaster[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [detail, setDetail]             = useState<any>(null);
  const [deployments, setDeployments]   = useState<Deployment[]>([]);
  const [reroutePlan, setReroutePlan]   = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    load();
    // ERT WS — refresh on disaster events
    const unsub = wsService.onAlert((alert: WSAlert) => {
      if (['disaster.evaluated', 'disaster.dispatched', 'disaster.updated',
           'disaster.verified', 'disaster.resolved', 'disaster.false_alarm',
           'disaster.unit_completed'].includes(alert.event_type)) {
        load();
        if (selectedId) loadDetail(selectedId);
      }
      if (alert.event_type === 'disaster.backup_requested') {
        Alert.alert('⚠️ BACKUP REQUESTED',
          `${alert.title}\n\n${alert.message}`,
          [{ text: 'View Missions', onPress: () => navigation.navigate('ActiveMissions') },
           { text: 'OK' }]);
      }
      if (alert.event_type === 'coordination.escalation') {
        Alert.alert('🚨 ESCALATION', alert.message, [{ text: 'OK' }]);
      }
    });
    return () => unsub();
  }, [selectedId]);

  const load = async () => {
    setError(null);
    try {
      // GET /disasters/active — ERT-integration.md Section 4
      const data = await authRequest<any>('/disasters/active');
      const list: ActiveDisaster[] = data?.disasters ?? (Array.isArray(data) ? data : []);
      setDisasters(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
        loadDetail(list[0].id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load active disasters. Check your connection.');
      console.error('[Command] Failed to load disasters:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const [det, deps, reroute] = await Promise.allSettled([
        authRequest<any>(`/disasters/${id}`),                   // Section 4
        authRequest<any>(`/disasters/${id}/deployments`),       // Section 4
        authRequest<any>(`/reroute/status/${id}`),              // Section 9
      ]);
      if (det.status === 'fulfilled')     setDetail(det.value);
      if (deps.status === 'fulfilled')    setDeployments(deps.value?.deployments ?? deps.value ?? []);
      if (reroute.status === 'fulfilled') setReroutePlan(reroute.value);
    } catch {}
    setDetailLoading(false);
  };

  const selectDisaster = (d: ActiveDisaster) => {
    setSelectedId(d.id);
    setDetail(null);
    setDeployments([]);
    setReroutePlan(null);
    loadDetail(d.id);
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Command View</Text>
        <TouchableOpacity style={S.hBtn} onPress={onRefresh}>
          <Text style={{ color: '#fff', fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading active disasters...</Text>
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

          {/* Disaster list */}
          {!!error && (
            <View style={{ backgroundColor: '#FEE2E2', margin: 12, padding: 14,
                           borderRadius: 10, borderLeftWidth: 3, borderLeftColor: RED }}>
              <Text style={{ color: '#991B1B', fontSize: 13 }}>{error}</Text>
              <TouchableOpacity onPress={load} style={{ marginTop: 6 }}>
                <Text style={{ color: RED, fontWeight: '700', fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {!error && disasters.length === 0 ? (
            <View style={S.emptyCard}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={S.emptyTitle}>No Active Disasters</Text>
              <Text style={S.emptySub}>All clear. No active incidents in the system.</Text>
            </View>
          ) : (
            <>
              <Text style={S.sectionLabel}>ACTIVE INCIDENTS ({disasters.length})</Text>
              {disasters.map(d => {
                const sev = (d.severity ?? 'LOW').toUpperCase();
                const col = SEV_COLOR[sev] ?? '#6B7280';
                const isSelected = d.id === selectedId;
                return (
                  <TouchableOpacity key={d.id} style={[S.disasterCard, isSelected && S.disasterCardSelected]}
                    onPress={() => selectDisaster(d)} activeOpacity={0.8}>
                    <View style={[S.sevBar, { backgroundColor: col }]} />
                    <Text style={{ fontSize: 28, marginRight: 12 }}>{TYPE_EMOJI[d.type] ?? '⚠️'}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Text style={S.disasterType}>{d.type?.replace(/_/g, ' ')}</Text>
                        <View style={[S.sevPill, { backgroundColor: col + '20' }]}>
                          <Text style={[S.sevPillTxt, { color: col }]}>{sev}</Text>
                        </View>
                      </View>
                      <Text style={S.disasterAddr}>{d.location_address}</Text>
                      <Text style={S.disasterMeta}>
                        {d.tracking_id} · {d.people_affected > 0 ? `${d.people_affected} affected` : ''} 
                        {d.assigned_department ? ` · ${d.assigned_department}` : ''}
                      </Text>
                    </View>
                    <View style={[S.statusDot, { backgroundColor: STATUS_COLOR[d.disaster_status] ?? '#6B7280' }]} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Detail panel for selected disaster */}
          {selectedId && (
            <View style={S.detailPanel}>
              <Text style={S.sectionLabel}>SELECTED INCIDENT DETAIL</Text>
              {detailLoading ? (
                <ActivityIndicator color={RED} style={{ margin: 20 }} />
              ) : detail ? (
                <>
                  {/* Basic info */}
                  <View style={S.card}>
                    <Text style={S.cardTitle}>Incident Info</Text>
                    <Text style={S.infoRow}>Status: <Text style={S.infoVal}>{detail.disaster_status ?? detail.status}</Text></Text>
                    <Text style={S.infoRow}>Severity: <Text style={S.infoVal}>{detail.severity}</Text></Text>
                    <Text style={S.infoRow}>Location: <Text style={S.infoVal}>{detail.location_address}</Text></Text>
                    {detail.people_affected > 0 && (
                      <Text style={S.infoRow}>Affected: <Text style={S.infoVal}>{detail.people_affected} people</Text></Text>
                    )}
                    {detail.description && (
                      <Text style={S.infoRow}>Notes: <Text style={S.infoVal}>{detail.description}</Text></Text>
                    )}
                    <TouchableOpacity style={S.viewBtn}
                      onPress={() => navigation.navigate('ActiveMissions')}>
                      <Text style={S.viewBtnTxt}>View Active Missions →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Deployments */}
                  {deployments.length > 0 && (
                    <View style={S.card}>
                      <Text style={S.cardTitle}>Deployments ({deployments.length})</Text>
                      {deployments.map((dep: any, i: number) => (
                        <View key={dep.id ?? i} style={S.depRow}>
                          <View style={[S.depStatus, { backgroundColor: STATUS_COLOR[dep.deployment_status] ?? '#6B7280' }]}>
                            <Text style={S.depStatusTxt}>{dep.deployment_status}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={S.depName}>{dep.unit_name ?? `Unit #${i + 1}`}</Text>
                            {dep.eta_minutes != null && dep.deployment_status === 'EN_ROUTE' && (
                              <Text style={S.depMeta}>ETA: {dep.eta_minutes} min</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Reroute plan */}
                  {reroutePlan && (
                    <View style={S.card}>
                      <Text style={S.cardTitle}>Reroute Plan Active</Text>
                      <Text style={S.infoRow}>Plan: <Text style={S.infoVal}>{reroutePlan.plan_id ?? reroutePlan.id ?? 'Active'}</Text></Text>
                      <Text style={S.infoRow}>Routes: <Text style={S.infoVal}>{(reroutePlan.chosen_routes ?? []).length} routes calculated</Text></Text>
                      {reroutePlan.impact_radius_km && (
                        <Text style={S.infoRow}>Impact radius: <Text style={S.infoVal}>{reroutePlan.impact_radius_km} km</Text></Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ color: '#9CA3AF', padding: 16 }}>Select a disaster to see details</Text>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hBtn:         { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  disasterCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  disasterCardSelected: { borderWidth: 2, borderColor: RED },
  sevBar:       { width: 4, height: '100%' as any, borderRadius: 2, marginRight: 12 },
  disasterType: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  disasterAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  disasterMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  sevPill:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  sevPillTxt:   { fontSize: 10, fontWeight: '800' },
  statusDot:    { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },

  detailPanel:  { paddingBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginHorizontal: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  infoRow:    { fontSize: 13, color: '#6B7280', marginBottom: 5 },
  infoVal:    { color: '#1F2937', fontWeight: '600' },
  viewBtn:    { marginTop: 10, backgroundColor: RED + '15', borderRadius: 8, padding: 10, alignItems: 'center' },
  viewBtnTxt: { color: RED, fontWeight: '700', fontSize: 14 },
  depRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  depStatus:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  depStatusTxt:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  depName:    { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  depMeta:    { fontSize: 12, color: '#6B7280', marginTop: 2 },

  emptyCard:  { margin: 24, padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
});

export default DisasterCommandScreen;