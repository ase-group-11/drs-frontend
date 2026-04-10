// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/UnitStatusScreen/UnitStatusScreen.tsx
//
// Allows a responder to view their unit's current status and update it.
//
// APIs:
//   GET  /emergency-units/{unit_id}       → fetch unit details + current status
//   PUT  /emergency-units/{unit_id}       → update unit_status field
//
// Status lifecycle:
//   AVAILABLE → DEPLOYED → ON_SCENE → RETURNING → AVAILABLE
//                                              ↘ MAINTENANCE
//                                              ↘ OFFLINE
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text }          from '@atoms/Text';
import { spacing }       from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import { authRequest, authService, getUserUnitInfo } from '@services/authService';
import { disasterStore } from '@services/disasterStore';
import { API } from '@services/apiConfig';

// ─── Constants ────────────────────────────────────────────────────────────

const RED = '#DC2626';

// All valid unit statuses from UnitStatus enum (backend: app/db/models/enums.py)
type UnitStatus =
  | 'available'
  | 'deployed'
  | 'on_scene'
  | 'returning'
  | 'maintenance'
  | 'offline';

interface StatusOption {
  value:            UnitStatus;
  label:            string;
  description:      string;
  color:            string;
  bg:               string;
  icon:             string;
  allowedFrom:      UnitStatus[];
  // When true, user cannot change away from this status in UnitStatusScreen
  // (must use Active Missions screen instead)
  lockedWhenCurrent?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value:       'available',
    label:       'Available',
    description: 'Ready to be dispatched',
    color:       '#16A34A',
    bg:          '#DCFCE7',
    icon:        '✅',
    allowedFrom: ['returning', 'maintenance', 'on_scene', 'deployed', 'offline'],
  },
  {
    value:       'deployed',
    label:       'Deployed',
    description: 'Dispatched — en route to incident',
    color:       '#2563EB',
    bg:          '#DBEAFE',
    icon:        '🚒',
    // ✅ Cannot transition FROM deployed here — use Active Missions screen instead
    allowedFrom: ['available'],
    lockedWhenCurrent: true,
  },
  {
    value:       'on_scene',
    label:       'On Scene',
    description: 'Actively working at incident site',
    color:       '#7C3AED',
    bg:          '#EDE9FE',
    icon:        '🎯',
    // ✅ Cannot transition FROM on_scene here — use Active Missions screen instead
    allowedFrom: ['deployed'],
    lockedWhenCurrent: true,
  },
  {
    value:       'returning',
    label:       'Returning',
    description: 'Returning to base after incident',
    color:       '#EA580C',
    bg:          '#FFF7ED',
    icon:        '↩️',
    allowedFrom: ['on_scene', 'deployed'],
  },
  {
    value:       'maintenance',
    label:       'Maintenance',
    description: 'Vehicle or equipment under service',
    color:       '#CA8A04',
    bg:          '#FEF9C3',
    icon:        '🔧',
    allowedFrom: ['available', 'returning'],
  },
  {
    value:       'offline',
    label:       'Offline',
    description: 'Unit out of service',
    color:       '#6B7280',
    bg:          '#F3F4F6',
    icon:        '⛔',
    allowedFrom: ['available', 'maintenance', 'returning'],
  },
];

const STATUS_MAP: Record<string, StatusOption> = {};
STATUS_OPTIONS.forEach(s => { STATUS_MAP[s.value] = s; });

const UNIT_TYPE_LABEL: Record<string, string> = {
  ambulance:      '🚑 Ambulance',
  fire_engine:    '🚒 Fire Engine',
  patrol_car:     '🚓 Patrol Car',
  rapid_response: '⚡ Rapid Response',
  hazmat:         '☣️ HAZMAT',
  rescue:         '🪝 Rescue',
  command:        '📡 Command',
};

const DEPT_LABEL: Record<string, string> = {
  FIRE: '🔥 Fire', MEDICAL: '🏥 Medical', POLICE: '👮 Police', IT: '💻 IT',
  fire: '🔥 Fire', medical: '🏥 Medical', police: '👮 Police', it: '💻 IT',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmt = (iso?: string | null) =>
  !iso ? '—' : new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const fmtSeconds = (s?: number | null) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

// ─── Back button ──────────────────────────────────────────────────────────

const BackBtn = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </TouchableOpacity>
);

// ─── Info row ─────────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={S.infoRow}>
    <Text style={S.infoLabel}>{label}</Text>
    <Text style={S.infoValue}>{value}</Text>
  </View>
);

// ─── Stat box ─────────────────────────────────────────────────────────────

const StatBox = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={[S.statBox, { borderTopColor: color }]}>
    <Text style={[S.statValue, { color }]}>{value}</Text>
    <Text style={S.statLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────

export const UnitStatusScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [unit, setUnit]               = useState<any>(null);
  const [unitId, setUnitId]           = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<UnitStatus | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<UnitStatus | null>(null);

  // ── Load unit ────────────────────────────────────────────────────────────
  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const { unitId: uid } = await getUserUnitInfo();
      if (!uid) {
        setError('No unit assigned to your account.\nContact your admin to be assigned to a unit.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setUnitId(uid);

      const data = await authRequest<any>(API.units.byId(uid));
      setUnit(data);
      setSelectedStatus((data.unit_status ?? 'available').toLowerCase() as UnitStatus);
    } catch (e: any) {
      setError(e.message || 'Failed to load unit details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ✅ Subscribe to disasterStore — when ActiveMissions updates unit status,
  // reflect it immediately here without needing a manual refresh
  useEffect(() => {
    const unsub = disasterStore.subscribe(() => {
      const storeStatus = disasterStore.getState().unitStatus;
      if (storeStatus && storeStatus !== selectedStatus) {
        setSelectedStatus(storeStatus as UnitStatus);
        // Also update the unit object so the banner reflects the change
        setUnit((prev: any) => prev ? { ...prev, unit_status: storeStatus } : prev);
      }
    });
    return unsub;
  }, [selectedStatus]);

  // ── Handle status tap ────────────────────────────────────────────────────
  const handleStatusTap = (status: UnitStatus) => {
    if (status === selectedStatus) return;
    const current = selectedStatus ?? 'available';
    const currentOption = STATUS_MAP[current];

    // ✅ If currently deployed or on_scene, block changes — must use Active Missions
    if (currentOption?.lockedWhenCurrent) {
      Alert.alert(
        '🚒 Use Active Missions',
        `Your unit is currently "${currentOption.label}". To update your status during an active mission, go to Active Missions and use the Update Status button there.`,
        [{ text: 'Got it' }]
      );
      return;
    }

    const option = STATUS_MAP[status];

    // Check if transition is allowed
    if (!option.allowedFrom.includes(current as UnitStatus)) {
      Alert.alert(
        'Invalid Transition',
        `You cannot change from "${STATUS_MAP[current]?.label ?? current}" to "${option.label}" directly.\n\nValid transitions: ${STATUS_OPTIONS.filter(s => s.allowedFrom.includes(current as UnitStatus)).map(s => s.label).join(', ') || 'none'}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setPendingStatus(status);
    setShowConfirm(true);
  };

  // ── Confirm status update ─────────────────────────────────────────────────
  const confirmUpdate = async () => {
    if (!pendingStatus || !unitId) return;
    setShowConfirm(false);
    setSaving(true);
    try {
      await authRequest(API.units.update(unitId), {
        method: 'PUT',
        body:   JSON.stringify({ unit_status: pendingStatus }),
      });
      setSelectedStatus(pendingStatus);
      // Refresh full unit data after update
      const updated = await authRequest<any>(API.units.byId(unitId));
      setUnit(updated);
      // ✅ Sync to global store so other screens reflect immediately
      disasterStore.setUnitStatus(pendingStatus);
      Alert.alert('✅ Status Updated', `Unit status changed to "${STATUS_MAP[pendingStatus]?.label}".`);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update status. Please try again.');
    } finally {
      setSaving(false);
      setPendingStatus(null);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={S.header}>
          <BackBtn onPress={() => navigation.goBack()} />
          <Text style={S.headerTitle}>Unit Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.centred}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={S.loadingText}>Loading unit details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !unit) {
    return (
      <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={S.header}>
          <BackBtn onPress={() => navigation.goBack()} />
          <Text style={S.headerTitle}>Unit Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.centred}>
          <Text style={{ fontSize: 52, lineHeight: 64 }}>🚒</Text>
          <Text style={S.errorTitle}>No Unit Found</Text>
          <Text style={S.errorBody}>{error ?? 'Could not load unit details.'}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={S.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentOption = selectedStatus ? STATUS_MAP[selectedStatus] : STATUS_MAP['available'];
  const successPct    = unit.success_rate != null ? `${Math.round(unit.success_rate * 100)}%` : '—';

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={S.header}>
        <BackBtn onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text style={S.headerTitle}>Unit Status</Text>
          <Text style={S.headerSub}>{unit.unit_code ?? ''}</Text>
        </View>
        <TouchableOpacity
          style={S.hBtn}
          onPress={() => { setLoading(true); load(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: '#fff', fontSize: 18, lineHeight: 24 }}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={RED}
          />
        }
      >

        {/* ── Current Status Banner ── */}
        <View style={[S.statusBanner, { backgroundColor: currentOption.bg, borderColor: currentOption.color }]}>
          <View style={S.statusBannerLeft}>
            <Text style={{ fontSize: 32, lineHeight: 42 }}>{currentOption.icon}</Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[S.statusBannerLabel, { color: currentOption.color }]}>
                {currentOption.label}
              </Text>
              <Text style={S.statusBannerDesc}>{currentOption.description}</Text>
            </View>
          </View>
          <View style={[S.statusDot, { backgroundColor: currentOption.color }]} />
        </View>

        {/* ── Unit Identity Card ── */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <Text style={S.cardTitle}>Unit Details</Text>
            <View style={[S.unitTypePill, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[S.unitTypePillTxt, { color: RED }]}>
                {UNIT_TYPE_LABEL[unit.unit_type?.toLowerCase()] ?? unit.unit_type ?? '—'}
              </Text>
            </View>
          </View>
          <InfoRow label="Unit Name"   value={unit.unit_name ?? '—'} />
          <InfoRow label="Unit Code"   value={unit.unit_code ?? '—'} />
          <InfoRow label="Department"  value={DEPT_LABEL[unit.department] ?? unit.department ?? '—'} />
          <InfoRow label="Station"     value={unit.station_name ?? '—'} />
          {unit.station_address ? <InfoRow label="Address" value={unit.station_address} /> : null}
          {unit.vehicle_model ? (
            <InfoRow
              label="Vehicle"
              value={`${unit.vehicle_model}${unit.vehicle_year ? ` (${unit.vehicle_year})` : ''}${unit.vehicle_license_plate ? ` · ${unit.vehicle_license_plate}` : ''}`}
            />
          ) : null}
          <InfoRow label="Capacity"    value={`${unit.crew_count ?? 0} / ${unit.capacity ?? 4} crew`} />
        </View>

        {/* ── Performance Stats ── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Performance</Text>
          <View style={S.statsRow}>
            <StatBox label="Deployments"   value={`${unit.total_deployments ?? 0}`}  color="#2563EB" />
            <StatBox label="Avg Response"  value={fmtSeconds(unit.avg_response_time_seconds)} color="#7C3AED" />
            <StatBox label="Success Rate"  value={successPct}                          color="#16A34A" />
          </View>
          {unit.last_deployed_at ? (
            <Text style={S.lastDeployed}>Last deployed: {fmt(unit.last_deployed_at)}</Text>
          ) : null}
        </View>

        {/* ── Update Status ── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Update Status</Text>
          {STATUS_MAP[selectedStatus ?? 'available']?.lockedWhenCurrent ? (
            <View style={S.lockedBanner}>
              <Text style={S.lockedBannerText}>
                🔒 Status changes are managed through <Text style={{ fontWeight: '800' }}>Active Missions</Text> while deployed or on scene.
              </Text>
            </View>
          ) : (
            <Text style={S.cardSubtitle}>
              Tap a status to update. Only valid transitions from your current status are highlighted.
            </Text>
          )}

          <View style={S.statusGrid}>
            {STATUS_OPTIONS.map(opt => {
              const isCurrent  = selectedStatus === opt.value;
              const canTransit = opt.allowedFrom.includes(selectedStatus as UnitStatus);
              const isDisabled = !isCurrent && !canTransit;

              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    S.statusOption,
                    isCurrent  && { borderColor: opt.color, backgroundColor: opt.bg, borderWidth: 2.5 },
                    !isCurrent && canTransit && S.statusOptionAvailable,
                    isDisabled && S.statusOptionDisabled,
                  ]}
                  onPress={() => handleStatusTap(opt.value)}
                  activeOpacity={isDisabled ? 1 : 0.75}
                  disabled={saving}
                >
                  <Text style={{ fontSize: 26, lineHeight: 34, marginBottom: 4 }}>{opt.icon}</Text>
                  <Text style={[
                    S.statusOptionLabel,
                    isCurrent  && { color: opt.color, fontWeight: '800' },
                    isDisabled && { color: '#9CA3AF' },
                  ]}>
                    {opt.label}
                  </Text>
                  <Text style={[
                    S.statusOptionDesc,
                    isDisabled && { color: '#D1D5DB' },
                  ]} numberOfLines={2}>
                    {opt.description}
                  </Text>
                  {isCurrent && (
                    <View style={[S.currentBadge, { backgroundColor: opt.color }]}>
                      <Text style={S.currentBadgeTxt}>CURRENT</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {saving && (
            <View style={S.savingRow}>
              <ActivityIndicator size="small" color={RED} />
              <Text style={S.savingText}>Updating status…</Text>
            </View>
          )}
        </View>

        {/* ── Equipment Checklist ── */}
        {unit.equipment_checklist && unit.equipment_checklist.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>Equipment Checklist</Text>
            {unit.equipment_checklist.map((item: any, idx: number) => (
              <View key={idx} style={S.equipRow}>
                <Text style={{ fontSize: 16, lineHeight: 22, marginRight: 8 }}>
                  {item.present ? '✅' : '❌'}
                </Text>
                <Text style={[S.equipItem, !item.present && { color: '#EF4444' }]}>
                  {item.item ?? item.name ?? `Item ${idx + 1}`}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── Confirm Status Change Modal ── */}
      {showConfirm && pendingStatus && (
        <View style={S.confirmOverlay}>
          <View style={S.confirmSheet}>
            <Text style={S.confirmTitle}>Confirm Status Change</Text>

            <View style={S.confirmArrow}>
              <View style={[S.confirmPill, { backgroundColor: currentOption.bg }]}>
                <Text style={[S.confirmPillTxt, { color: currentOption.color }]}>
                  {currentOption.icon} {currentOption.label}
                </Text>
              </View>
              <Text style={S.arrowChar}>→</Text>
              <View style={[S.confirmPill, { backgroundColor: STATUS_MAP[pendingStatus].bg }]}>
                <Text style={[S.confirmPillTxt, { color: STATUS_MAP[pendingStatus].color }]}>
                  {STATUS_MAP[pendingStatus].icon} {STATUS_MAP[pendingStatus].label}
                </Text>
              </View>
            </View>

            <Text style={S.confirmBody}>
              {STATUS_MAP[pendingStatus].description}
            </Text>

            <View style={S.confirmBtns}>
              <TouchableOpacity
                style={S.confirmCancel}
                onPress={() => { setShowConfirm(false); setPendingStatus(null); }}
              >
                <Text style={S.confirmCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.confirmOk, { backgroundColor: STATUS_MAP[pendingStatus].color }]}
                onPress={confirmUpdate}
              >
                <Text style={S.confirmOkTxt}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8FAFC' },
  centred:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: RED,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  hBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },

  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  errorTitle:  { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  errorBody:   { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn:    {
    marginTop: 20, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: RED, borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, borderWidth: 2,
    padding: 16, marginBottom: 12,
  },
  statusBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusBannerLabel:{ fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  statusBannerDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusDot:        { width: 12, height: 12, borderRadius: 6 },

  // Cards
  card:        {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  cardSubtitle:{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 18 },

  // Info rows
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel:   { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  infoValue:   { fontSize: 13, color: '#1F2937', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 12 },

  // Unit type pill
  unitTypePill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  unitTypePillTxt:{ fontSize: 12, fontWeight: '700' },

  // Stats
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statBox:     {
    flex: 1, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingVertical: 12, borderTopWidth: 3,
  },
  statValue:   { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  statLabel:   { fontSize: 11, color: '#6B7280', marginTop: 3, textAlign: 'center' },
  lastDeployed:{ fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // Status grid
  statusGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusOption:{
    width: '47%', borderRadius: 12,
    padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    minHeight: 120,
  },
  statusOptionAvailable: { borderColor: '#6B7280', borderStyle: 'dashed' },
  statusOptionDisabled:  { opacity: 0.4 },
  statusOptionLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
  statusOptionDesc:  { fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 14 },
  currentBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
  currentBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  savingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  savingText:  { color: '#6B7280', fontSize: 13 },

  // Equipment
  equipRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  equipItem:   { fontSize: 14, color: '#374151', fontWeight: '500' },

  // Confirm modal
  confirmOverlay:{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  confirmSheet:{
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  confirmTitle:{ fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  confirmArrow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 },
  arrowChar:   { fontSize: 20, color: '#6B7280' },
  confirmPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  confirmPillTxt: { fontSize: 14, fontWeight: '700' },
  confirmBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmCancel:{
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  confirmCancelTxt: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  confirmOk:   { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmOkTxt:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  lockedBanner:{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#2563EB' },
  lockedBannerText:{ fontSize: 13, color: '#1E40AF', lineHeight: 18 },
});

export default UnitStatusScreen;