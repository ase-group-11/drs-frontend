// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/DisasterDetailScreen/DisasterDetailScreen.tsx
//
// Full disaster detail. Tabs: Details | Deployments
// Group chat is in ActiveMissionsScreen (per-mission).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest } from '@services/authService';
import { SEVERITY_COLOR } from '@services/disasterStore';

const RED = '#DC2626';
const TYPE_EMOJI: Record<string, string> = { FIRE: '🔥', FLOOD: '🌊', STORM: '⛈️', EARTHQUAKE: '🏚️', HURRICANE: '🌀', EXPLOSION: '💥', GAS_LEAK: '☁️', ACCIDENT: '🚗', HAZMAT: '☣️', OTHER: '⚠️' };
const DEP_COLOR: Record<string, string> = { DISPATCHED: '#3B82F6', EN_ROUTE: '#F97316', ON_SCENE: '#8B5CF6', IN_PROGRESS: '#EF4444', COMPLETED: '#22C55E', CANCELLED: '#6B7280' };

const fmt = (iso?: string | null) => !iso ? '—' : new Date(iso).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const DisasterDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { disasterId } = route.params ?? {};

  const [tab, setTab] = useState<'details' | 'deployments'>('details');
  const [disaster, setDisaster] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [deploySummary, setDeploySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (disasterId) loadAll(); }, [disasterId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [det, deps] = await Promise.allSettled([
        authRequest<any>(`/disasters/${disasterId}`),
        authRequest<any>(`/disasters/${disasterId}/deployments`),
      ]);
      if (det.status === 'fulfilled') setDisaster(det.value);
      if (deps.status === 'fulfilled') { setDeployments(deps.value?.deployments ?? []); setDeploySummary(deps.value?.summary ?? null); }
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={S.header}><Back onPress={() => navigation.goBack()} /><Text style={S.ht}>Loading...</Text><View style={{ width: 40 }} /></View>
        <View style={S.center}><ActivityIndicator size="large" color={RED} /></View>
      </SafeAreaView>
    );
  }

  const d = disaster;
  const sev = (d?.severity ?? 'LOW').toUpperCase();
  const col = SEVERITY_COLOR[sev] ?? '#6B7280';

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={S.header}>
        <Back onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text style={S.ht}>{(d?.type ?? '').replace(/_/g, ' ') || 'Disaster'}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{d?.tracking_id ?? ''}</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={loadAll}><Text style={{ color: '#fff', fontSize: 18, lineHeight: 24 }}>↻</Text></TouchableOpacity>
      </View>

      <View style={S.tabs}>
        {(['details', 'deployments'] as const).map(t => (
          <TouchableOpacity key={t} style={[S.tab, tab === t && S.tabOn]} onPress={() => setTab(t)}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtOn]}>{t === 'details' ? 'Details' : `Units (${deployments.length})`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'details' && d && (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={[S.card, { borderLeftWidth: 4, borderLeftColor: col }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 32, lineHeight: 42, marginRight: 10 }}>{TYPE_EMOJI[d.type] ?? '⚠️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#1F2937' }}>{(d.type ?? '').replace(/_/g, ' ')}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <View style={[S.pill, { backgroundColor: col + '20' }]}><Text style={[S.pillTxt, { color: col }]}>{sev}</Text></View>
                  <View style={[S.pill, { backgroundColor: (DEP_COLOR[d.disaster_status] ?? '#6B7280') + '20' }]}><Text style={[S.pillTxt, { color: DEP_COLOR[d.disaster_status] ?? '#6B7280' }]}>{d.disaster_status}</Text></View>
                </View>
              </View>
            </View>
          </View>
          <View style={S.card}><Text style={S.ct}>Location</Text><R l="Address" v={d.location_address ?? '—'} />{d.location && <R l="Coordinates" v={`${d.location.lat?.toFixed(4)}, ${d.location.lon?.toFixed(4)}`} />}{d.affected_area && <R l="Affected area" v={d.affected_area} />}</View>
          <View style={S.card}><Text style={S.ct}>Impact</Text><R l="People affected" v={`${d.people_affected ?? 0}`} /><R l="Casualties" v={d.multiple_casualties ? 'Yes' : 'No'} /><R l="Structural damage" v={d.structural_damage ? 'Yes' : 'No'} /><R l="Road blocked" v={d.road_blocked ? 'Yes' : 'No'} />{d.description && <R l="Description" v={d.description} />}</View>
          {d.assignment && <View style={S.card}><Text style={S.ct}>Assignment</Text><R l="Department" v={d.assignment.assigned_department ?? '—'} /><R l="Assigned to" v={d.assignment.assigned_to_name ?? '—'} />{d.assignment.assigned_to_phone && <R l="Phone" v={d.assignment.assigned_to_phone} />}<R l="Units" v={`${d.units_assigned ?? 0}`} /><R l="Reports" v={`${d.report_count ?? 0}`} /></View>}
          {d.timeline && <View style={S.card}><Text style={S.ct}>Timeline</Text><R l="Reported" v={fmt(d.timeline.created_at)} /><R l="Response" v={fmt(d.timeline.response_time)} /><R l="Resolved" v={fmt(d.timeline.resolved_time)} />{d.resolution_notes && <R l="Resolution" v={d.resolution_notes} />}</View>}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {tab === 'deployments' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {deploySummary && (
            <View style={S.card}><Text style={S.ct}>Summary</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SB label="Dispatched" value={`${deploySummary.dispatched ?? 0}`} color="#3B82F6" />
                <SB label="En Route" value={`${deploySummary.en_route ?? 0}`} color="#F97316" />
                <SB label="On Scene" value={`${deploySummary.on_scene ?? 0}`} color="#8B5CF6" />
                <SB label="Done" value={`${deploySummary.completed ?? 0}`} color="#22C55E" />
              </View>
            </View>
          )}
          {deployments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ fontSize: 40, lineHeight: 52 }}>🚒</Text><Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 8 }}>No units deployed</Text></View>
          ) : deployments.map((dep, i) => {
            const sc = DEP_COLOR[dep.deployment_status] ?? '#6B7280';
            const u = dep.unit ?? {};
            return (
              <View key={dep.deployment_id ?? i} style={S.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[S.depBadge, { backgroundColor: sc }]}><Text style={S.depBadgeTxt}>{dep.deployment_status}</Text></View>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>{dep.priority_level ?? ''}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>{u.unit_name || u.unit_code || `Unit #${i + 1}`}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{u.department ?? ''} · {u.unit_type ?? ''}</Text>
                {dep.situation_report && <Text style={{ fontSize: 12, color: '#374151', marginTop: 6, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>{dep.situation_report}</Text>}
                {(dep.casualties?.minor > 0 || dep.casualties?.serious > 0) && <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Casualties: {dep.casualties.minor} minor, {dep.casualties.serious} serious</Text>}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Back = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  </TouchableOpacity>
);
const R: React.FC<{ l: string; v: string }> = ({ l, v }) => (<Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{l}: <Text style={{ color: '#1F2937', fontWeight: '600' }}>{v}</Text></Text>);
const SB: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (<View style={{ flex: 1, alignItems: 'center', backgroundColor: color + '10', borderRadius: 8, padding: 8 }}><Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '800', color }}>{value}</Text><Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</Text></View>);

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 14 },
  ht: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: RED },
  tabTxt: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTxtOn: { color: RED, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  ct: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt: { fontSize: 11, fontWeight: '800' },
  depBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  depBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default DisasterDetailScreen;