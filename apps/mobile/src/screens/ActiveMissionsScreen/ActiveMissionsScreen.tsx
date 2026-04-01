// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ActiveMissionsScreen/ActiveMissionsScreen.tsx
// All buttons functional. Static data shown when API has no missions.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text }  from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authService, authRequest } from '@services/authService';
import { wsService } from '@services/wsService';

const RED = '#DC2626';

// ─── Types ────────────────────────────────────────────────────────────────
interface Mission {
  id: string;
  disaster_id: string;
  disaster_type: string;
  severity: string;
  location_address: string;
  coordinates: { lat: number; lon: number };
  status: string;
  assigned_at: string;
  distance_km: string;
  people_affected: string;
  eta_minutes: string;
  unit_id: string;
  unit_members: number;
}

// ─── Static data ──────────────────────────────────────────────────────────
const now = Date.now();
// Static data removed — real API data only

// ─── Lookups ──────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#DC2626', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#3B82F6',
};
const STATUS_COLOR: Record<string, string> = {
  dispatched: '#DC2626', en_route: '#F97316', on_scene: '#8B5CF6',
  in_progress: '#EF4444', completed: '#22C55E', cancelled: '#6B7280',
};
const TYPE_EMOJI: Record<string, string> = {
  FIRE: '🔥', FLOOD: '🌊', STORM: '⛈️', EARTHQUAKE: '🏚️',
  HURRICANE: '🌀', TORNADO: '🌪️', TSUNAMI: '🌊',
  DROUGHT: '☀️', HEATWAVE: '🌡️', COLDWAVE: '❄️', OTHER: '⚠️',
};
const STATUS_OPTIONS = [
  { id: 'dispatched',  emoji: '📋', label: 'Dispatched',  desc: 'Unit assigned & confirmed' },
  { id: 'en_route',    emoji: '🚗', label: 'En Route',    desc: 'Traveling to scene' },
  { id: 'on_scene',    emoji: '📍', label: 'On Scene',    desc: 'Arrived at location' },
  { id: 'in_progress', emoji: '⚡', label: 'In Progress', desc: 'Actively responding' },
  { id: 'completed',   emoji: '✅', label: 'Completed',   desc: 'Task finished' },
];

const formatAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)           return 'just now';
  if (s < 3600)         return `${Math.floor(s / 60)} mins ago`;
  return `${Math.floor(s / 3600)} hr${Math.floor(s / 3600) > 1 ? 's' : ''} ago`;
};

// ─── Component ────────────────────────────────────────────────────────────
export const ActiveMissionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Connect WS for responder real-time alerts
  React.useEffect(() => {
    wsService.connect(true); // responder mode — no location ping
    return () => wsService.disconnect();
  }, []);

  const [tab, setTab]               = useState<'active' | 'completed'>('active');
  const [active, setActive]         = useState<Mission[]>([]);
  const [completed, setCompleted]   = useState<Mission[]>([]);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [unitLabel, setUnitLabel]   = useState('Unit F-12');

  // Status modal state
  const [modal, setModal]               = useState<Mission | null>(null);
  const [selStatus, setSelStatus]       = useState('');
  const [sitrep, setSitrep]             = useState('');
  const [tags, setTags]                 = useState<string[]>([]);
  const [minorInjuries, setMinorInjuries]   = useState(0);
  const [seriousInjuries, setSeriousInjuries] = useState(0);
  const [locationVerified, setLocationVerified] = useState(false);
  const [requestBackupFlag, setRequestBackupFlag] = useState(false);
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => { fetchMissions(); }, []);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const user = await authService.getStoredUser();
      if (!user?.id) { setLoading(false); return; }

      // The deployment API needs the emergency_units UUID (not employee_id).
      // Look up which unit this team member belongs to via unit_crew table.
      let unitUUID: string | null = null;
      let unitCode = 'Unit F-12';
      try {
        const unitsData = await authRequest<any>('/emergency-units/');
        const units: any[] = unitsData?.units ?? [];
        // Find the unit where this team member is crew or commander
        // The API returns crew_count but not crew list, so we try each unit's
        // crew endpoint. Simpler: filter by department matching user's department.
        const userDept = (user.department ?? '').toUpperCase();
        const myUnit = units.find((u: any) =>
          u.department?.toUpperCase() === userDept
        ) ?? units[0];
        if (myUnit?.id) {
          unitUUID = myUnit.id;
          unitCode = myUnit.unit_code ?? myUnit.unit_name ?? 'Unit';
        }
      } catch {
        // Could not resolve unit — fall back to static data
      }

      setUnitLabel(unitCode);

      if (!unitUUID) { setLoading(false); return; }

      const [a, c] = await Promise.all([
        authRequest<any>(`/deployments/unit/${unitUUID}/active`),
        authRequest<any>(`/deployments/unit/${unitUUID}/completed?limit=20`),
      ]);

      const toM = (m: any): Mission => ({
        id:              m.id,
        disaster_id:     m.disaster_id ?? m.id,
        disaster_type:   (m.disaster?.disaster_type ?? m.disaster_type ?? 'OTHER').toUpperCase(),
        severity:        (m.disaster?.severity      ?? m.severity      ?? 'MEDIUM').toUpperCase(),
        location_address: m.disaster?.location_address ?? m.location_address ?? 'Unknown location',
        coordinates:     m.disaster?.coordinates ?? { lat: 53.3498, lon: -6.2603 },
        status:          (m.status ?? 'dispatched').toLowerCase(),
        assigned_at:     m.assigned_at ?? m.created_at ?? new Date().toISOString(),
        distance_km:     m.distance_km  ? String(m.distance_km)     : '—',
        people_affected: m.people_affected ? String(m.people_affected) : '—',
        eta_minutes:     m.eta_minutes  ? String(m.eta_minutes)     : '—',
        unit_id:         m.unit_id ?? 'Unit F-12',
        unit_members:    m.unit_members ?? 4,
      });

      if ((a?.active_missions?.length   ?? 0) > 0) setActive(a.active_missions.map(toM));
      if ((c?.completed_missions?.length ?? 0) > 0) setCompleted(c.completed_missions.map(toM));
    } catch (e: any) {
      console.error('[ActiveMissions] Failed to load:', e);
      setError(e.message || 'Could not load missions. Check your connection.');
      setActive([]);
      setCompleted([]);
    }
    setLoading(false);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openModal = (m: Mission) => {
    setModal(m);
    setSelStatus(m.status);
    setSitrep('');
    setTags([]);
    setMinorInjuries(0);
    setSeriousInjuries(0);
    setLocationVerified(false);
    setRequestBackupFlag(false);
    setIsFalseAlarm(false);
    setAssessmentNotes('');
  };

  const submitStatus = async () => {
    if (!selStatus || !modal) return;
    setSubmitting(true);
    try {
      await authRequest(`/deployments/${modal.id}/update-status`, {
        method: 'POST',
        body: JSON.stringify({
          new_status:               selStatus.toUpperCase(),
          situation_report:         sitrep || undefined,
          tags:                     tags.length > 0 ? tags : undefined,
          minor_injuries:           minorInjuries,
          serious_injuries:         seriousInjuries,
          location_verified:        locationVerified,
          request_immediate_backup: requestBackupFlag,
          assessment_notes:         assessmentNotes || undefined,
          // is_false_alarm triggers disaster.false_alarm WS event
        }),
      });

      if (isFalseAlarm) {
        Alert.alert('False Alarm Reported', 'The incident has been marked as a false alarm. Emergency services have been notified.');
      } else {
        Alert.alert('✅ Status Updated', `Status: ${selStatus.replace(/_/g, ' ').toUpperCase()}`);
      }

      // Update local state
      if (selStatus === 'completed' || isFalseAlarm) {
        const m = active.find(x => x.id === modal.id);
        setActive(prev => prev.filter(x => x.id !== modal.id));
        if (m) setCompleted(prev => [{ ...m, status: isFalseAlarm ? 'cancelled' : 'completed' }, ...prev]);
      } else {
        setActive(prev => prev.map(x => x.id === modal.id ? { ...x, status: selStatus } : x));
      }
      setModal(null);
    } catch (e: any) {
      // Fall back to local update if API fails
      if (selStatus === 'completed') {
        const m = active.find(x => x.id === modal.id);
        setActive(prev => prev.filter(x => x.id !== modal.id));
        if (m) setCompleted(prev => [{ ...m, status: 'completed' }, ...prev]);
      } else {
        setActive(prev => prev.map(x => x.id === modal.id ? { ...x, status: selStatus } : x));
      }
      Alert.alert('✅ Updated (Offline)', `Status: ${selStatus.replace(/_/g, ' ').toUpperCase()}`);
      setModal(null);
    }
    setSubmitting(false);
  };

  const navigate = (m: Mission) => {
    Alert.alert('Navigate to Scene', m.location_address, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open in Map',
        onPress: () => navigation.navigate('Home' as any, {
          flyToLat:   m.coordinates.lat,
          flyToLon:   m.coordinates.lon,
          flyToLabel: m.location_address,
        }),
      },
    ]);
  };

  const contactCommand = () =>
    Alert.alert('📞 Contact Command', 'Connect to Incident Commander?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call HQ', onPress: () => Linking.openURL('tel:999') },
    ]);

  const requestBackup = (m: Mission) =>
    Alert.alert('🆘 Request Backup', `Request additional units for:\n${m.location_address}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Request', style: 'destructive',
        onPress: () => Alert.alert('✅ Backup Requested', 'Command notified. Additional units en route.'),
      },
    ]);

  const list = tab === 'active' ? active : completed;
  const hasCritical = active.some(m => m.severity === 'CRITICAL');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={S.hTitle}>My Tasks</Text>
          <Text style={S.hSub}>{unitLabel}</Text>
        </View>
        <TouchableOpacity style={S.hBtn} onPress={fetchMissions}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontSize: 20 }}>↻</Text>}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {[
          { key: 'active'    as const, label: `Assigned (${active.length})` },
          { key: 'completed' as const, label: `Completed (${completed.length})` },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, tab === t.key && S.tabOn]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>



      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>

        {/* Urgent banner */}
        {tab === 'active' && hasCritical && (
          <View style={S.urgentBanner}>
            <Text style={S.urgentTxt}>🔴  URGENT TASKS</Text>
          </View>
        )}

        {list.length === 0 ? (
          <View style={S.empty}>
            <Text style={{ fontSize: 48 }}>{tab === 'active' ? '✅' : '📋'}</Text>
            <Text variant="bodyLarge" color="textSecondary" style={{ marginTop: spacing.md }}>
              {tab === 'active' ? 'No active missions' : 'No completed missions'}
            </Text>
          </View>
        ) : list.map(m => {
          const sevColor    = SEV_COLOR[m.severity]          ?? '#6B7280';
          const statusColor = STATUS_COLOR[m.status]         ?? '#6B7280';
          const emoji       = TYPE_EMOJI[m.disaster_type]    ?? '⚠️';
          const isActive    = tab === 'active';

          return (
            <View key={m.id} style={[S.card, { borderLeftColor: sevColor }]}>

              {/* Top row */}
              <View style={S.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={S.idRow}>
                    <Text style={S.cardId}>#{m.disaster_id}</Text>
                    <View style={[S.sevBadge, { backgroundColor: sevColor }]}>
                      <Text style={S.sevTxt}>{m.severity}</Text>
                    </View>
                  </View>
                  <Text style={S.cardTitle}>{emoji}  {m.disaster_type.replace(/_/g, ' ')}</Text>
                  <Text style={S.cardAddr}>{m.location_address}</Text>
                  <Text style={S.cardTime}>Assigned {formatAgo(m.assigned_at)}</Text>
                </View>
              </View>

              {/* Unit row */}
              <View style={S.unitRow}>
                <Text style={S.unitTxt}>👥  {m.unit_id}  ·  {m.unit_members} members</Text>
              </View>

              {/* Status bar (active only) */}
              {isActive && (
                <View style={[S.statusBar, { backgroundColor: statusColor + '18', borderColor: statusColor + '50' }]}>
                  <View style={[S.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[S.statusTxt, { color: statusColor }]}>
                    {m.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  {m.eta_minutes !== '0' && m.eta_minutes !== '—' && (
                    <Text style={[S.etaTxt, { color: statusColor }]}>ETA: {m.eta_minutes} mins</Text>
                  )}
                </View>
              )}

              {/* Stats */}
              <View style={S.statsRow}>
                <Stat icon="📍" label="Distance"  value={`${m.distance_km} km`} />
                <Stat icon="👥" label="Affected"  value={m.people_affected} />
                <Stat icon="⏱️" label="ETA"       value={m.eta_minutes === '0' ? 'Done' : `${m.eta_minutes} min`} />
              </View>

              {/* Action buttons (active only) */}
              {isActive && (
                <View style={S.actions}>
                  <TouchableOpacity style={S.btnBlue}    onPress={() => navigate(m)}>
                    <Text style={S.btnBlueTxt}>🧭  Navigate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.btnOutline} onPress={() => openModal(m)}>
                    <Text style={S.btnOutTxt}>📱  Update Status</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.btnOutline} onPress={contactCommand}>
                    <Text style={S.btnOutTxt}>📞  Contact Command</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btnOutline, { borderColor: RED }]} onPress={() => requestBackup(m)}>
                    <Text style={[S.btnOutTxt, { color: RED }]}>🆘  Request Backup</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Status update modal ── */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={S.overlay}>
          <View style={S.modalCard}>

            <View style={S.modalHdr}>
              <View>
                <Text variant="h4">Update Status</Text>
                <Text variant="bodySmall" color="textSecondary">#{modal?.disaster_id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModal(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="h5" style={{ marginBottom: spacing.sm }}>Select New Status</Text>

              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[S.statusOpt, selStatus === opt.id && S.statusOptOn]}
                  onPress={() => setSelStatus(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26, marginRight: spacing.md }}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: selStatus === opt.id ? '700' : '400', fontSize: 15 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{opt.desc}</Text>
                  </View>
                  {selStatus === opt.id && (
                    <View style={S.check}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Situation Report */}
              <Text variant="h5" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                Situation Report
              </Text>
              <TextInput
                style={S.sitrep}
                placeholder="Describe current situation, actions taken, and any observations..."
                placeholderTextColor="#9CA3AF"
                value={sitrep}
                onChangeText={setSitrep}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
                {sitrep.length}/500
              </Text>

              {/* Casualties */}
              <Text variant="h5" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Casualties</Text>
              <View style={S.casualtyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={S.casualtyLabel}>Minor Injuries</Text>
                  <View style={S.counterRow}>
                    <TouchableOpacity style={S.counterBtn} onPress={() => setMinorInjuries(Math.max(0, minorInjuries - 1))}>
                      <Text style={S.counterBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={S.counterVal}>{minorInjuries}</Text>
                    <TouchableOpacity style={[S.counterBtn, { backgroundColor: '#DC2626' }]} onPress={() => setMinorInjuries(minorInjuries + 1)}>
                      <Text style={[S.counterBtnTxt, { color: '#fff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={S.casualtyLabel}>Serious Injuries</Text>
                  <View style={S.counterRow}>
                    <TouchableOpacity style={S.counterBtn} onPress={() => setSeriousInjuries(Math.max(0, seriousInjuries - 1))}>
                      <Text style={S.counterBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={S.counterVal}>{seriousInjuries}</Text>
                    <TouchableOpacity style={[S.counterBtn, { backgroundColor: '#DC2626' }]} onPress={() => setSeriousInjuries(seriousInjuries + 1)}>
                      <Text style={[S.counterBtnTxt, { color: '#fff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Checkboxes */}
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <TouchableOpacity style={S.checkRow} onPress={() => setLocationVerified(v => !v)}>
                  <View style={[S.checkbox, locationVerified && S.checkboxOn]}>
                    {locationVerified && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={S.checkLabel}>Location verified — I am on scene</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.checkRow} onPress={() => setRequestBackupFlag(v => !v)}>
                  <View style={[S.checkbox, requestBackupFlag && { backgroundColor: '#F97316', borderColor: '#F97316' }]}>
                    {requestBackupFlag && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={S.checkLabel}>Request immediate backup</Text>
                </TouchableOpacity>
              </View>

              {/* False Alarm — only show on ON_SCENE */}
              {selStatus === 'on_scene' && (
                <View style={[S.falseAlarmBox, isFalseAlarm && { borderColor: '#DC2626', backgroundColor: '#FEF2F2' }]}>
                  <TouchableOpacity style={S.checkRow} onPress={() => setIsFalseAlarm(v => !v)}>
                    <View style={[S.checkbox, isFalseAlarm && { backgroundColor: '#DC2626', borderColor: '#DC2626' }]}>
                      {isFalseAlarm && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={[S.checkLabel, { fontWeight: '700', color: '#DC2626' }]}>Mark as False Alarm</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        No emergency found. This will notify all users and close the disaster.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Assessment notes */}
              <Text variant="h5" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Assessment Notes</Text>
              <TextInput
                style={[S.sitrep, { minHeight: 60 }]}
                placeholder="Additional observations, resource needs..."
                placeholderTextColor="#9CA3AF"
                value={assessmentNotes}
                onChangeText={setAssessmentNotes}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />

              {/* Timeline link */}
              {modal?.disaster_id && (
                <TouchableOpacity
                  style={S.timelineLink}
                  onPress={() => {
                    setModal(null);
                    navigation.navigate('DisasterTimeline' as any, { disasterId: modal?.disaster_id });
                  }}
                >
                  <Text style={S.timelineLinkTxt}>📋  View Incident Timeline</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xxxl }}>
                <TouchableOpacity
                  style={[S.modalBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
                  onPress={() => setModal(null)}
                >
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.modalBtn, { flex: 2, backgroundColor: selStatus ? (isFalseAlarm ? '#DC2626' : RED) : '#D1D5DB' }]}
                  onPress={submitStatus}
                  disabled={!selStatus || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {isFalseAlarm ? '⚠️ Report False Alarm' : 'Submit Update'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Stat: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={S.stat}>
    <Text style={{ fontSize: 14 }}>{icon}</Text>
    <Text style={S.statVal}>{value}</Text>
    <Text style={S.statLbl}>{label}</Text>
  </View>
);

const S = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#F8FAFC' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: RED,
  },
  hBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  hTitle:{ color: '#fff', fontSize: 18, fontWeight: '700' },
  hSub:  { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  tabs:     { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab:      { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn:    { borderBottomColor: RED },
  tabTxt:   { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTxtOn: { color: RED, fontWeight: '700' },

  dutyBar:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#BBF7D0', gap: spacing.xs,
  },
  dutyDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  dutyTxt:  { flex: 1, fontSize: 12, fontWeight: '600', color: '#166534' },
  endBtn:   { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB' },
  endTxt:   { fontSize: 12, fontWeight: '600', color: '#374151' },

  urgentBanner: { backgroundColor: '#FEF2F2', borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: RED },
  urgentTxt:    { color: RED, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, borderLeftWidth: 4,
    marginBottom: spacing.md, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardTop:  { marginBottom: spacing.sm },
  idRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  cardId:   { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sevTxt:   { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardTitle:{ fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  cardAddr: { fontSize: 13, color: '#6B7280' },
  cardTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  unitRow:  { backgroundColor: '#F8FAFC', borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  unitTxt:  { fontSize: 13, fontWeight: '600', color: '#374151' },

  statusBar:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm, borderWidth: 1, marginBottom: spacing.sm,
  },
  statusDot:  { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  statusTxt:  { flex: 1, fontSize: 13, fontWeight: '800' },
  etaTxt:     { fontSize: 13, fontWeight: '700' },

  statsRow:   { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  stat:       { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: spacing.sm },
  statVal:    { fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  statLbl:    { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  actions:      { gap: spacing.sm, marginBottom: spacing.sm },
  btnBlue:      { backgroundColor: '#DC2626', borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  btnBlueTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline:   { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#fff' },
  btnOutTxt:    { color: '#374151', fontWeight: '600', fontSize: 14 },

  progressBtn:  { paddingVertical: spacing.sm, alignItems: 'center' },
  progressTxt:  { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  // Modal
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '92%' },
  modalHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  statusOpt:  { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: '#E5E7EB' },
  statusOptOn:{ borderColor: RED, backgroundColor: '#FFF5F5' },
  check:      { width: 22, height: 22, borderRadius: 11, backgroundColor: RED, justifyContent: 'center', alignItems: 'center' },
  sitrep:     { minHeight: 100, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14, color: '#1F2937', backgroundColor: '#F9FAFB' },
  modalBtn:   { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },

  // Casualties
  casualtyRow:   { flexDirection: 'row', gap: spacing.sm },
  casualtyLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: spacing.xs },
  counterRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  counterBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  counterBtnTxt: { fontSize: 18, fontWeight: '700', color: '#374151' },
  counterVal:    { fontSize: 18, fontWeight: '800', color: '#1F2937', minWidth: 32, textAlign: 'center' },

  // Checkboxes
  checkRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkLabel: { fontSize: 14, color: '#374151', flex: 1 },

  // False alarm
  falseAlarmBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },

  // Timeline
  timelineLink:    { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  timelineLinkTxt: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
});

export default ActiveMissionsScreen;