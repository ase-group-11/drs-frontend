// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/EvacuationPlansScreen/EvacuationPlansScreen.tsx
//
// APIs used:
//   GET  /api/v1/live-map/disasters                → active disasters (citizen API)
//   GET  /api/v1/evacuations/?disaster_id={id}     → plans for that disaster
//   GET  /api/v1/evacuations/{plan_id}             → full plan detail
//   GET  /api/v1/evacuations/{plan_id}/progress    → live completion metrics
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import { authRequest, authService } from '@services/authService';

// ─── Types ────────────────────────────────────────────────────────────────
interface ActiveDisaster {
  disaster_id: string;
  tracking_id?: string;
  type?: string;
  severity: string;
  status?: string;
  location_address?: string;
  people_affected?: number;
  trigger_evacuation?: boolean;
  recommended_services?: string[];
  confidence?: number;
}

interface EvacuationPlan {
  id: string;
  plan_ref: string;
  disaster_id: string;
  plan_status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  auto_approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  activated_at?: string;
  created_at?: string;
  impact_zones?: Zone[];
  shelters_with_capacity?: Shelter[];
  population_stats?: { total: number; vulnerable: number; zones_count: number };
  transport_plan?: TransportPlan;
  allocations?: { buses_allocated: number; ambulances_allocated: number };
  completion_metrics?: Record<string, ZoneMetrics>;
  best_routes_per_zone?: Record<string, Route[]>;
  notes?: string;
}

interface Zone {
  zone_id: string;
  name: string;
  lat: number;
  lon: number;
  population: number;
  vulnerable_count?: number;
  distance_from_disaster_km?: number;
  priority?: number;
}

interface Shelter {
  shelter_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  current_occupancy?: number;
  available?: number;
}

interface Route {
  route_id: string;
  origin_zone_id: string;
  zone_name?: string;
  destination_shelter_id: string;
  shelter_name?: string;
  distance_km?: number;
  estimated_time_min?: number;
  fallback?: boolean;
}

interface TransportPlan {
  total_buses: number;
  total_ambulances: number;
  total_people: number;
  total_vulnerable: number;
  schedules?: Array<{
    zone_id: string;
    zone_name: string;
    shelter_name: string;
    buses_needed: number;
    estimated_time_min: number;
  }>;
}

interface ZoneMetrics {
  percentage: number;
  evacuated: number;
  remaining: number;
  status?: string;
}

interface ProgressData {
  plan_id: string;
  plan_ref: string;
  plan_status: string;
  overall_completion: number;
  completion_metrics: Record<string, ZoneMetrics>;
  last_updated?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#DC2626', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#3B82F6',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F97316', APPROVED: '#3B82F6',
  ACTIVE: '#DC2626', COMPLETED: '#22C55E', CANCELLED: '#6B7280',
};

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳', APPROVED: '✅', ACTIVE: '🚨', COMPLETED: '✅', CANCELLED: '❌',
};

const TYPE_EMOJI: Record<string, string> = {
  FIRE: '🔥', FLOOD: '🌊', STORM: '⛈️', EARTHQUAKE: '🏚️',
  HURRICANE: '🌀', TORNADO: '🌪️', TSUNAMI: '🌊', OTHER: '⚠️',
};

const BackIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════

export const EvacuationPlansScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [evtDisasters, setEvtDisasters] = useState<ActiveDisaster[]>([]);
  const [plans, setPlans]               = useState<EvacuationPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<EvacuationPlan | null>(null);
  const [progress, setProgress]         = useState<ProgressData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isManager, setIsManager]       = useState(false); // ADMIN/MANAGER only can trigger/approve/activate
  const [view, setView]                 = useState<'list' | 'detail'>('list');

  useEffect(() => {
    loadAll();
    // Check if user has ADMIN or MANAGER role — only they can trigger/approve/activate
    authService.getStoredUser().then((user: any) => {
      const role = (user?.role ?? '').toUpperCase();
      setIsManager(role === 'ADMIN' || role === 'MANAGER');
      console.log('[EvacuationPlans] User role:', role, 'isManager:', role === 'ADMIN' || role === 'MANAGER');
    }).catch(() => {});
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadEvacuationDisasters(), loadPlans()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    if (selectedPlan) await loadProgress(selectedPlan.id);
    setRefreshing(false);
  };

  const loadEvacuationDisasters = async () => {
    try {
      // Citizen API: GET /live-map/disasters — disaster-evaluation/active-ranked is ERT-only
      const data = await authRequest<any>('/live-map/disasters?bounds=53.2,-6.45,53.45,-6.05');
      const arr: any[] = Array.isArray(data) ? data : (data?.disasters ?? []);
      const withEvac = arr
        .filter((d: any) => {
          const sev = (d.severity ?? '').toUpperCase();
          return sev === 'CRITICAL' || sev === 'HIGH';
        })
        .map((d: any) => ({
          disaster_id:          d.id ?? d.disaster_id,
          type:                 d.disaster_type ?? d.type ?? 'OTHER',
          severity:             (d.severity ?? 'MEDIUM').toUpperCase(),
          status:               d.disaster_status ?? d.status,
          location_address:     d.location?.address ?? d.location_address ?? 'Dublin',
          people_affected:      d.people_affected,
          trigger_evacuation:   true,
          recommended_services: d.recommended_services ?? [],
        }));
      setEvtDisasters(withEvac);
    } catch (e) {
      console.warn('Could not load active disasters:', e);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await authRequest<{ evacuation_plans: EvacuationPlan[] }>('/evacuations/');
      setPlans(data?.evacuation_plans ?? []);
    } catch (e) {
      console.warn('Could not load evacuation plans:', e);
    }
  };

  const loadPlanDetail = async (planId: string) => {
    setDetailLoading(true);
    try {
      const detail = await authRequest<EvacuationPlan>(`/evacuations/${planId}`);
      setSelectedPlan(detail);
      setView('detail');
      if (detail.plan_status === 'ACTIVE' || detail.plan_status === 'COMPLETED') {
        await loadProgress(planId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not load plan details');
    }
    setDetailLoading(false);
  };

  const loadProgress = async (planId: string) => {
    try {
      const prog = await authRequest<ProgressData>(`/evacuations/${planId}/progress`);
      setProgress(prog);
    } catch { /* Plan may not be active yet */ }
  };

  const openMaps = (lat: number, lon: number, name: string) => {
    // Navigate to in-app map (HomeScreen with Mapbox) - the map can show the location
    navigation.navigate('Home' as any);
  };

  // ── ERT Actions — ERT-integration.md Section 10 ────────────────────
  const triggerEvacuation = async (disasterId: string) => {
    try {
      console.log('[Evacuation] Triggering plan for disaster:', disasterId);
      // POST /evacuations/plan — ERT-integration.md Section 10
      const result = await authRequest<any>('/evacuations/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disaster_id: disasterId, auto_approve: false }),
      } as any);
      console.log('[Evacuation] Plan created:', result);
      Alert.alert('Evacuation Plan Created', 'Plan is pending approval.');
      await loadPlans();
    } catch (e: any) {
      console.error('[Evacuation] Trigger failed:', e.message);
      Alert.alert('Error', e.message || 'Failed to trigger evacuation');
    }
  };

  const approvePlan = async (planId: string) => {
    try {
      console.log('[Evacuation] Approving plan:', planId);
      // POST /evacuations/{plan_id}/approve — requires approved_by
      const user = await authService.getStoredUser() as any;
      const approvedBy = user?.full_name ?? user?.email ?? user?.employee_id ?? 'ERT Officer';
      await authRequest<any>(`/evacuations/${planId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: approvedBy, notes: '' }),
      } as any);
      console.log('[Evacuation] Plan approved by:', approvedBy);
      Alert.alert('Plan Approved', 'The evacuation plan has been approved.');
      await loadPlans();
    } catch (e: any) {
      console.error('[Evacuation] Approve failed:', e.message);
      Alert.alert('Error', e.message || 'Failed to approve plan');
    }
  };

  const activatePlan = async (planId: string) => {
    try {
      console.log('[Evacuation] Activating plan:', planId);
      await authRequest<any>(`/evacuations/${planId}/activate`, { method: 'POST' } as any);
      console.log('[Evacuation] Plan activated');
      Alert.alert('Plan Activated', 'Evacuation is now active and citizens have been notified.');
      await loadPlanDetail(planId);
    } catch (e: any) {
      console.error('[Evacuation] Activate failed:', e.message);
      Alert.alert('Error', e.message || 'Failed to activate plan');
    }
  };


  if (view === 'detail' && selectedPlan) {
    return (
      <DetailView
        plan={selectedPlan}
        progress={progress}
        onBack={() => { setView('list'); setSelectedPlan(null); setProgress(null); }}
        onRefresh={() => loadProgress(selectedPlan.id)}
        onNavigate={openMaps}
      />
    );
  }

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={S.header}>
        <BackIcon onPress={() => navigation.goBack()} />
        <Text variant="h4">Evacuation Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading evacuation data...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {evtDisasters.length > 0 && (
            <View style={S.alertSection}>
              <View style={S.alertBanner}>
                <Text style={S.alertIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.alertTitle}>EVACUATION TRIGGERED</Text>
                  <Text style={S.alertSub}>
                    {evtDisasters.length} active disaster{evtDisasters.length > 1 ? 's' : ''} require evacuation
                  </Text>
                </View>
              </View>

              {evtDisasters.map(d => (
                <View key={d.disaster_id} style={S.alertCard}>
                  <View style={S.alertCardTop}>
                    <Text style={{ fontSize: 28 }}>{TYPE_EMOJI[d.type ?? ''] ?? '⚠️'}</Text>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={S.alertCardTitle}>
                        {(d.type ?? 'Incident').replace(/_/g, ' ')} Emergency
                      </Text>
                      <Text style={S.alertCardAddr}>{d.location_address ?? 'Dublin, Ireland'}</Text>
                      {d.people_affected && (
                        <Text style={S.alertCardPop}>👥 ~{d.people_affected.toLocaleString()} affected</Text>
                      )}
                    </View>
                    {isManager && (
                      <TouchableOpacity
                        style={[S.ertActionBtn, { alignSelf: 'flex-start', backgroundColor: '#DC2626' }]}
                        onPress={() => { Alert.alert('Trigger Evacuation', 'Create evacuation plan for this disaster?',
                          [{ text: 'Cancel', style: 'cancel' }, { text: 'Trigger', onPress: () => triggerEvacuation(d.disaster_id) }]); }}>
                        <Text style={[S.ertActionTxt, { color: '#fff' }]}>Trigger Evac</Text>
                      </TouchableOpacity>
                    )}
                    <View style={[S.sevBadge, { backgroundColor: SEV_COLOR[d.severity] ?? '#6B7280' }]}>
                      <Text style={S.sevTxt}>{d.severity}</Text>
                    </View>
                  </View>

                  {plans.filter(p => p.disaster_id === d.disaster_id).map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={S.planChip}
                      onPress={() => loadPlanDetail(p.id)}
                      disabled={detailLoading}
                    >
                      <Text style={S.planChipIcon}>{STATUS_ICON[p.plan_status]}</Text>
                      <Text style={S.planChipText}>{p.plan_ref}</Text>
                      <View style={[S.statusPill, { backgroundColor: STATUS_COLOR[p.plan_status] + '20' }]}>
                        <Text style={[S.statusPillTxt, { color: STATUS_COLOR[p.plan_status] }]}>
                          {p.plan_status}
                        </Text>
                      </View>
                      {p.plan_status === 'PENDING' && isManager && (
                        <TouchableOpacity style={S.ertActionBtn}
                          onPress={() => { Alert.alert('Approve Plan', 'Approve this evacuation plan?',
                            [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: () => approvePlan(p.id) }]); }}>
                          <Text style={S.ertActionTxt}>Approve</Text>
                        </TouchableOpacity>
                      )}
                      {p.plan_status === 'APPROVED' && isManager && (
                        <TouchableOpacity style={[S.ertActionBtn, { backgroundColor: '#EF4444' }]}
                          onPress={() => { Alert.alert('Activate Plan', 'Activate this evacuation?',
                            [{ text: 'Cancel', style: 'cancel' }, { text: 'Activate', onPress: () => activatePlan(p.id) }]); }}>
                          <Text style={[S.ertActionTxt, { color: '#fff' }]}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={S.planChipArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          <Text style={S.sectionTitle}>ALL EVACUATION PLANS</Text>

          {plans.length === 0 ? (
            <View style={S.emptyCard}>
              <Text style={{ fontSize: 48 }}>🛡️</Text>
              <Text variant="h5" style={{ marginTop: spacing.md }}>No Plans Yet</Text>
              <Text variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                Evacuation plans are created by emergency coordinators when a disaster triggers evacuation.
              </Text>
            </View>
          ) : (
            plans.map(p => (
              <TouchableOpacity
                key={p.id}
                style={S.planCard}
                onPress={() => loadPlanDetail(p.id)}
                disabled={detailLoading}
                activeOpacity={0.8}
              >
                <View style={S.planCardLeft}>
                  <View style={[S.statusDot, { backgroundColor: STATUS_COLOR[p.plan_status] ?? '#6B7280' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={S.planCardRow}>
                    <Text style={S.planRef}>{p.plan_ref}</Text>
                    <View style={[S.statusPill, { backgroundColor: STATUS_COLOR[p.plan_status] + '18' }]}>
                      <Text style={[S.statusPillTxt, { color: STATUS_COLOR[p.plan_status] }]}>
                        {p.plan_status}
                      </Text>
                    </View>
                  </View>
                  <Text style={S.planMeta}>
                    {p.activated_at
                      ? `Active since ${new Date(p.activated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : p.created_at
                      ? `Created ${new Date(p.created_at).toLocaleDateString()}`
                      : 'Evacuation plan'}
                  </Text>
                  {p.approved_by && <Text style={S.planMeta}>Approved by: {p.approved_by}</Text>}
                </View>
                {detailLoading
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
                }
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Detail View
// ═══════════════════════════════════════════════════════════════════════════

const DetailView: React.FC<{
  plan: EvacuationPlan;
  progress: ProgressData | null;
  onBack: () => void;
  onRefresh: () => void;
  onNavigate: (lat: number, lon: number, name: string) => void;
}> = ({ plan, progress, onBack, onRefresh, onNavigate }) => {
  const statusColor = STATUS_COLOR[plan.plan_status] ?? '#6B7280';
  const zones       = plan.impact_zones ?? [];
  const shelters    = plan.shelters_with_capacity ?? [];
  const transport   = plan.transport_plan;
  const alloc       = plan.allocations;
  const metrics     = progress?.completion_metrics ?? plan.completion_metrics ?? {};
  const overall     = progress?.overall_completion ?? 0;
  const routes      = plan.best_routes_per_zone ?? {};

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={S.header}>
        <BackIcon onPress={onBack} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Plan Detail</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{plan.plan_ref}</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={onRefresh}>
          <Text style={{ fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>
        <View style={[S.statusBanner, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
          <Text style={{ fontSize: 28, marginRight: spacing.md }}>{STATUS_ICON[plan.plan_status]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[S.statusBannerTitle, { color: statusColor }]}>{plan.plan_status}</Text>
            <Text style={S.statusBannerSub}>
              {plan.plan_status === 'ACTIVE' ? `Evacuation in progress — ${overall.toFixed(0)}% complete`
               : plan.plan_status === 'COMPLETED' ? 'Evacuation successfully completed'
               : plan.plan_status === 'APPROVED'  ? 'Plan approved — awaiting activation'
               : plan.plan_status === 'PENDING'   ? 'Awaiting coordinator approval'
               : plan.plan_status}
            </Text>
          </View>
        </View>

        {(plan.plan_status === 'ACTIVE' || plan.plan_status === 'COMPLETED') && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Overall Evacuation Progress</Text>
            <View style={S.progressBarBg}>
              <View style={[S.progressBarFill, { width: `${Math.min(overall, 100)}%` as any }]} />
            </View>
            <Text style={S.progressPct}>{overall.toFixed(1)}% evacuated</Text>
            {Object.entries(metrics).map(([zoneId, m]) => {
              const zone = zones.find(z => z.zone_id === zoneId);
              return (
                <View key={zoneId} style={S.zoneProgress}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.zoneProgressName}>{zone?.name ?? zoneId}</Text>
                    <View style={S.progressBarBgSm}>
                      <View style={[S.progressBarFillSm, { width: `${Math.min(m.percentage ?? 0, 100)}%` as any }]} />
                    </View>
                  </View>
                  <Text style={S.zoneProgressPct}>{(m.percentage ?? 0).toFixed(0)}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {plan.population_stats && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Population Affected</Text>
            <View style={S.statsRow}>
              <StatBox icon="👥" label="Total"      value={(plan.population_stats.total ?? 0).toLocaleString()} />
              <StatBox icon="🏥" label="Vulnerable" value={(plan.population_stats.vulnerable ?? 0).toLocaleString()} />
              <StatBox icon="🏘️" label="Zones"     value={String(zones.length)} />
            </View>
          </View>
        )}

        {(transport || alloc) && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Transport & Resources</Text>
            <View style={S.statsRow}>
              <StatBox icon="🚌" label="Buses"      value={String(alloc?.buses_allocated ?? transport?.total_buses ?? 0)} />
              <StatBox icon="🚑" label="Ambulances" value={String(alloc?.ambulances_allocated ?? transport?.total_ambulances ?? 0)} />
              <StatBox icon="👤" label="People"     value={(transport?.total_people ?? 0).toLocaleString()} />
            </View>
          </View>
        )}

        {zones.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Impact Zones ({zones.length})</Text>
            {zones.map(z => {
              const bestRoute = (routes[z.zone_id] ?? [])[0];
              const m = metrics[z.zone_id];
              return (
                <View key={z.zone_id} style={S.zoneRow}>
                  <View style={[S.zonePriBadge, { backgroundColor: z.priority === 1 ? '#DC2626' : z.priority === 2 ? '#F97316' : '#EAB308' }]}>
                    <Text style={S.zonePriTxt}>{z.priority ?? '—'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={S.zoneName}>{z.name}</Text>
                    <Text style={S.zoneMeta}>
                      {(z.population ?? 0).toLocaleString()} residents
                      {z.distance_from_disaster_km != null ? ` · ${z.distance_from_disaster_km.toFixed(1)} km` : ''}
                    </Text>
                    {bestRoute && <Text style={S.zoneShelter}>→ {bestRoute.shelter_name} ({bestRoute.estimated_time_min} min)</Text>}
                    {m && <Text style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>{(m.percentage ?? 0).toFixed(0)}% evacuated</Text>}
                  </View>
                  <TouchableOpacity style={S.navBtn} onPress={() => onNavigate(z.lat, z.lon, z.name)}>
                    <Text style={S.navBtnTxt}>🧭</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {shelters.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Assigned Shelters ({shelters.length})</Text>
            {shelters.map(sh => (
              <View key={sh.shelter_id} style={S.shelterRow}>
                <Text style={{ fontSize: 22, marginRight: spacing.sm }}>🏛️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.shelterName}>{sh.name}</Text>
                  <View style={S.shelterMeta}>
                    <View style={S.availablePill}>
                      <View style={S.greenDot} />
                      <Text style={S.availableTxt}>Available</Text>
                    </View>
                    <Text style={S.shelterCap}>Capacity: {(sh.capacity ?? 0).toLocaleString()}</Text>
                  </View>
                </View>
                <View style={S.shelterBtns}>
                  <TouchableOpacity style={S.mapBtn} onPress={() => onNavigate(sh.lat, sh.lon, sh.name)}>
                    <Text style={S.mapBtnTxt}>Map</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.dirBtn} onPress={() => onNavigate(sh.lat, sh.lon, sh.name)}>
                    <Text style={S.dirBtnTxt}>↗ Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {transport?.schedules && transport.schedules.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Transport Schedule</Text>
            {transport.schedules.map((sch, i) => (
              <View key={i} style={S.schedRow}>
                <Text style={S.schedZone}>{sch.zone_name}</Text>
                <Text style={S.schedDetail}>→ {sch.shelter_name}</Text>
                <Text style={S.schedDetail}>🚌 {sch.buses_needed} buses · ⏱ {sch.estimated_time_min} min</Text>
              </View>
            ))}
          </View>
        )}

        {plan.notes ? (
          <View style={[S.card, { backgroundColor: '#FFFBEB' }]}>
            <Text style={S.cardTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#92400E', lineHeight: 20 }}>{plan.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatBox: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={S.statBox}>
    <Text style={{ fontSize: 20 }}>{icon}</Text>
    <Text style={S.statVal}>{value}</Text>
    <Text style={S.statLbl}>{label}</Text>
  </View>
);

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  alertSection: { padding: spacing.md, paddingBottom: 0 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626',
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
  },
  alertIcon: { fontSize: 24 },
  alertTitle: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  alertSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  alertCard: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: '#DC2626',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  alertCardTop:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  alertCardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  alertCardAddr:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  alertCardPop:   { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  sevTxt:   { color: '#fff', fontSize: 10, fontWeight: '800' },
  planChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: spacing.sm,
    marginTop: spacing.xs, borderWidth: 1, borderColor: '#E5E7EB',
  },
  planChipIcon:  { fontSize: 14 },
  planChipText:  { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  planChipArrow: { fontSize: 16, color: colors.primary },
  ertActionBtn:  { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 4 },
  ertActionTxt:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  ertActionBtn:  { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 4 },
  ertActionTxt:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: spacing.md, marginBottom: spacing.sm,
    borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  planCardLeft: { justifyContent: 'center', alignItems: 'center', width: 14 },
  planCardRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  planRef:  { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  planMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusPill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  statusDot:     { width: 12, height: 12, borderRadius: 6 },
  emptyCard: {
    margin: spacing.lg, padding: spacing.xl,
    backgroundColor: '#fff', borderRadius: borderRadius.lg, alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md,
  },
  statusBannerTitle: { fontSize: 17, fontWeight: '800' },
  statusBannerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: spacing.md },
  progressBarBg:    { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginBottom: spacing.xs },
  progressBarFill:  { height: 10, backgroundColor: '#3B82F6', borderRadius: 5 },
  progressPct:      { fontSize: 13, color: '#3B82F6', fontWeight: '700', textAlign: 'right', marginBottom: spacing.sm },
  zoneProgress:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  zoneProgressName: { fontSize: 13, color: '#374151', marginBottom: 4 },
  progressBarBgSm:  { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBarFillSm:{ height: 6, backgroundColor: '#22C55E', borderRadius: 3 },
  zoneProgressPct:  { fontSize: 13, fontWeight: '700', color: '#6B7280', minWidth: 36, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox:  { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: spacing.md },
  statVal:  { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 4 },
  statLbl:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  zoneRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.xs },
  zonePriBadge:{ width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  zonePriTxt:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  zoneName:    { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  zoneMeta:    { fontSize: 12, color: '#6B7280', marginTop: 2 },
  zoneShelter: { fontSize: 12, color: '#3B82F6', marginTop: 2 },
  navBtn:      { padding: spacing.xs },
  navBtnTxt:   { fontSize: 18 },
  shelterRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  shelterName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: spacing.xs },
  shelterMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  availablePill:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  greenDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  availableTxt:{ fontSize: 11, fontWeight: '600', color: '#166534' },
  shelterCap:  { fontSize: 12, color: '#6B7280' },
  shelterBtns: { gap: spacing.xs, marginLeft: spacing.xs },
  mapBtn:      { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  mapBtnTxt:   { fontSize: 12, color: '#374151', fontWeight: '600' },
  dirBtn:      { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6, backgroundColor: '#3B82F6' },
  dirBtnTxt:   { fontSize: 12, color: '#fff', fontWeight: '600' },
  schedRow:    { marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  schedZone:   { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  schedDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});

export default EvacuationPlansScreen;