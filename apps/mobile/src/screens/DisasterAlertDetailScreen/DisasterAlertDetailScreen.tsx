// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/DisasterAlertDetailScreen/DisasterAlertDetailScreen.tsx
//
// Citizen-facing disaster alert detail.
// Navigated to from AlertsScreen when a citizen taps a disaster.* alert.
//
// Theme: DRS blue (#1890FF) — NOT the responder red (#DC2626)
//
// Shows:
//   - What happened (type, severity, status)
//   - Where (address, coordinates)
//   - What it means for you (citizen safety advice by type)
//   - Key impacts (road blocked, structural damage, people affected)
//   - Actions (View on Map, Evacuation Plans if relevant)
//
// Fetches full detail from GET /disasters/{id}.
// Falls back gracefully to alert.data if the fetch fails.
//
// Nav param: { disasterId?: string; alert?: StoredAlert }
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text }            from '@atoms/Text';
import { spacing }         from '@theme/spacing';
import { mapActionStore }  from '@services/mapActionStore';
import { colors }          from '@theme/colors';
import Svg, { Path }       from 'react-native-svg';
import { authRequest }     from '@services/authService';
import { API }             from '@services/apiConfig';

// ── Constants ──────────────────────────────────────────────────────────────

const BLUE    = colors.primary;       // #1890FF
const NAVY    = colors.navy;          // #1E3A5F

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  MEDIUM:   '#EAB308',
  LOW:      '#1890FF',
  INFO:     '#6B7280',
};

const TYPE_EMOJI: Record<string, string> = {
  FLOOD:      '🌊',
  FIRE:       '🔥',
  EARTHQUAKE: '🏚️',
  HURRICANE:  '🌀',
  TORNADO:    '🌪️',
  TSUNAMI:    '🌊',
  DROUGHT:    '🏜️',
  HEATWAVE:   '🌡️',
  COLDWAVE:   '🧊',
  STORM:      '⛈️',
  OTHER:      '⚠️',
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE:     { label: 'Active',     color: '#EF4444' },
  VERIFIED:   { label: 'Verified',   color: '#F97316' },
  DISPATCHED: { label: 'Responding', color: '#1890FF' },
  RESOLVED:   { label: 'Resolved',   color: '#22C55E' },
  REJECTED:   { label: 'Closed',     color: '#6B7280' },
};

// ── Safety advice per disaster type ────────────────────────────────────────

interface SafetyAdvice {
  headline: string;
  steps:    string[];
  doNot:    string[];
}

const SAFETY_ADVICE: Record<string, SafetyAdvice> = {
  FLOOD: {
    headline: 'Avoid flooded roads and areas',
    steps:    ['Move to higher ground if in the affected zone', 'Turn off electricity at the mains if water is entering your home', 'Prepare an emergency kit', 'Follow Garda / local authority instructions'],
    doNot:    ["Don't walk through floodwater — 15 cm can knock you over", "Don't drive through flooded roads", "Don't touch electrical equipment if wet"],
  },
  FIRE: {
    headline: 'Stay away from the affected area',
    steps:    ['Keep windows and doors closed', 'Follow any evacuation orders immediately', 'Move upwind of the fire', 'Call 999 if you see the fire spreading'],
    doNot:    ["Don't re-enter buildings", "Don't use lifts in affected buildings", "Don't drive through smoke"],
  },
  EARTHQUAKE: {
    headline: 'Drop, Cover, Hold On',
    steps:    ['Get under a sturdy table or desk', 'Hold on until shaking stops', 'Move away from buildings and power lines once shaking stops', 'Check yourself and others for injuries'],
    doNot:    ["Don't stand in doorways", "Don't run outside during shaking", "Don't use lifts after the event"],
  },
  HURRICANE: {
    headline: 'Shelter in place — away from windows',
    steps:    ['Go to the innermost room on the lowest floor', 'Secure all outdoor items before the storm hits', 'Have a battery radio and torch ready', 'Stay indoors until authorities give the all-clear'],
    doNot:    ["Don't go outside during the eye of the storm", "Don't drive unless it's a life-or-death emergency", "Don't shelter in a mobile home or caravan"],
  },
  TORNADO: {
    headline: 'Get underground or to the lowest floor immediately',
    steps:    ['Go to a basement or interior room away from windows', 'Protect your head and neck with your arms', 'If outdoors, lie flat in a low-lying ditch', 'Listen for the all-clear from emergency services'],
    doNot:    ["Don't try to outrun a tornado in a car", "Don't shelter under bridges or overpasses", "Don't open windows"],
  },
  TSUNAMI: {
    headline: 'Move inland and uphill immediately',
    steps:    ['Move as far inland and as high as possible', 'Follow signs to tsunami evacuation zones', 'Stay away from the coast until the all-clear is given', 'A tsunami is a series of waves — the first may not be the largest'],
    doNot:    ["Don't go to the shore to watch", "Don't return until officials say it's safe", "Don't assume one wave means it's over"],
  },
  DROUGHT: {
    headline: 'Conserve water and follow usage restrictions',
    steps:    ['Follow any water usage restrictions from local authorities', 'Report water leaks immediately', 'Avoid unnecessary outdoor water use', 'Check on elderly or vulnerable neighbours'],
    doNot:    ["Don't ignore official water restrictions", "Don't water lawns or wash cars during restrictions", "Don't waste water"],
  },
  HEATWAVE: {
    headline: 'Stay cool, hydrated and out of the sun',
    steps:    ['Drink water regularly even if not thirsty', 'Stay in the coolest room or find air-conditioned public spaces', 'Check on elderly, young children and vulnerable people', 'Avoid strenuous activity between 11am and 3pm'],
    doNot:    ["Don't leave children or pets in parked cars", "Don't drink alcohol or caffeine as your main fluid", "Don't exercise outdoors during peak heat"],
  },
  COLDWAVE: {
    headline: 'Stay warm and check on vulnerable people',
    steps:    ['Layer clothing and keep heating on low continuously', 'Check on elderly neighbours and vulnerable people', 'Keep roads and paths clear of ice if possible', 'Have an emergency supply of food and water in case of power outage'],
    doNot:    ["Don't use outdoor gas appliances or BBQs indoors for heat", "Don't drive on ice unless essential", "Don't let pipes freeze — keep cupboard doors open near pipes"],
  },
  STORM: {
    headline: 'Stay indoors and away from windows',
    steps:    ['Secure loose outdoor items', 'Stay indoors until the all-clear is issued', 'Keep away from rivers, coastlines and flooded areas', 'Have a torch and battery radio ready'],
    doNot:    ["Don't travel unless essential", "Don't shelter under trees", "Don't use candles near curtains"],
  },
  OTHER: {
    headline: 'Follow official instructions',
    steps:    ['Stay informed via local radio and official channels', 'Follow Garda and emergency service instructions', 'Keep clear of the affected area', 'Call 999 in an emergency'],
    doNot:    ["Don't share unverified information", "Don't enter the affected zone", "Don't obstruct emergency services"],
  },
};

const getSafetyAdvice = (type: string): SafetyAdvice =>
  SAFETY_ADVICE[type?.toUpperCase()] ?? SAFETY_ADVICE.DEFAULT;

// ── Helpers ────────────────────────────────────────────────────────────────

import { formatTimeAgo } from '@utils/formatters';

const fmtTime = formatTimeAgo;

// openMaps removed — location card now navigates to the in-app HomeScreen map

// ── Small components ────────────────────────────────────────────────────────

const BackBtn = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={S.hBtn} onPress={onPress} activeOpacity={0.7}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7"
        stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </TouchableOpacity>
);

const Section = ({ title }: { title: string }) => (
  <Text style={S.sectionTitle}>{title}</Text>
);

const Row = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
  <View style={S.row}>
    <Text style={S.rowLabel}>{label}</Text>
    <Text style={[S.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
  </View>
);

// ── Main Screen ─────────────────────────────────────────────────────────────

export const DisasterAlertDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { disasterId, alert: passedAlert } = route.params ?? {};

  const [disaster,  setDisaster]  = useState<any>(passedAlert?.data ?? null);
  const [loading,   setLoading]   = useState(!!disasterId);

  // Fetch full disaster detail if we have an ID
  useEffect(() => {
    if (!disasterId) return;
    setLoading(true);
    authRequest<any>(API.disasters.byId(disasterId))
      .then(d => setDisaster(d))
      .catch(() => {/* keep passedAlert data as fallback */})
      .finally(() => setLoading(false));
  }, [disasterId]);

  const d        = disaster;
  const type     = (d?.type ?? d?.disaster_type ?? 'OTHER').toUpperCase();
  const severity = (d?.severity ?? passedAlert?.severity ?? 'LOW').toUpperCase();
  const status   = d?.disaster_status ?? 'ACTIVE';
  const sevColor = SEV_COLOR[severity] ?? '#6B7280';
  const statusMeta = STATUS_LABEL[status] ?? { label: status, color: '#6B7280' };
  const advice   = getSafetyAdvice(type);
  const hasEvac  = type === 'FIRE' || type === 'FLOOD' || type === 'HURRICANE'
                || type === 'TSUNAMI' || type === 'TORNADO';
  const hasRoadBlock = d?.road_blocked;
  const lat      = d?.location?.lat ?? d?.location?.latitude;
  const lon      = d?.location?.lon ?? d?.location?.longitude;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Header */}
      <View style={S.header}>
        <BackBtn onPress={() => navigation.goBack()} />
        <View style={{ alignItems: 'center' }}>
          <Text style={S.headerTitle}>Disaster Alert</Text>
          {d?.tracking_id && (
            <Text style={S.headerSub}>{d.tracking_id}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>
            Loading alert details…
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>

          {/* ── Hero card ──────────────────────────────────────────── */}
          <View style={[S.heroCard, { borderTopColor: sevColor }]}>
            <Text style={S.heroEmoji}>{TYPE_EMOJI[type] ?? '⚠️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.heroType}>
                {type.replace(/_/g, ' ')}
              </Text>
              <View style={S.heroRow}>
                {/* Severity */}
                <View style={[S.pill, { backgroundColor: sevColor + '18' }]}>
                  <Text style={[S.pillTxt, { color: sevColor }]}>{severity}</Text>
                </View>
                {/* Status */}
                <View style={[S.pill, { backgroundColor: statusMeta.color + '18' }]}>
                  <Text style={[S.pillTxt, { color: statusMeta.color }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </View>
              {d?.created_at && (
                <Text style={S.heroTime}>Reported {fmtTime(d.created_at)}</Text>
              )}
            </View>
          </View>

          {/* ── Location ───────────────────────────────────────────── */}
          {(d?.location_address || lat) && (
            <>
              <Section title="LOCATION" />
              <View style={S.card}>
                <Row label="Address" value={d?.location_address ?? '—'} />
                {lat && lon && (
                  <Row label="Coordinates" value={`${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`} />
                )}
                {d?.affected_area && (
                  <Row label="Affected area" value={d.affected_area} />
                )}
              </View>
            </>
          )}

          {/* ── Impact ─────────────────────────────────────────────── */}
          {(d?.people_affected > 0 || d?.road_blocked || d?.structural_damage || d?.multiple_casualties) && (
            <>
              <Section title="IMPACT" />
              <View style={S.card}>
                {d?.people_affected > 0 && (
                  <Row label="People affected" value={`${Math.round(d.people_affected)}`} valueColor={sevColor} />
                )}
                {d?.road_blocked && (
                  <Row label="Roads"  value="Blocked in affected area" valueColor="#F97316" />
                )}
                {d?.structural_damage && (
                  <Row label="Structural damage" value="Reported" valueColor="#EF4444" />
                )}
                {d?.multiple_casualties && (
                  <Row label="Casualties" value="Reported" valueColor="#EF4444" />
                )}
                {d?.description && (
                  <View style={S.descBox}>
                    <Text style={S.descTxt}>{d.description}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── What to do ─────────────────────────────────────────── */}
          <Section title="WHAT TO DO" />
          <View style={S.card}>
            <View style={S.adviceHeadline}>
              <Text style={{ fontSize: 18, lineHeight: 26 }}>⚡</Text>
              <Text style={S.adviceHeadlineTxt}>{advice.headline}</Text>
            </View>

            <Text style={S.adviceSubhead}>Do this:</Text>
            {advice.steps.map((step, i) => (
              <View key={i} style={S.adviceStep}>
                <View style={[S.stepDot, { backgroundColor: BLUE }]} />
                <Text style={S.adviceStepTxt}>{step}</Text>
              </View>
            ))}

            <Text style={[S.adviceSubhead, { color: '#EF4444', marginTop: 14 }]}>
              Do NOT:
            </Text>
            {advice.doNot.map((item, i) => (
              <View key={i} style={S.adviceStep}>
                <View style={[S.stepDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[S.adviceStepTxt, { color: '#6B7280' }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* ── Emergency contacts ─────────────────────────────────── */}
          <Section title="EMERGENCY CONTACTS" />
          <View style={S.card}>
            {[
              { label: 'Emergency Services',   number: '999',           icon: '🚨' },
              { label: 'Civil Defence',         number: '1800 202 116',  icon: '🛡️' },
              { label: 'ESB Networks (power)',  number: '1800 372 999',  icon: '⚡' },
              { label: 'Gas Networks Ireland',  number: '1800 20 50 50', icon: '🔧' },
            ].map(({ label, number, icon }) => (
              <TouchableOpacity
                key={label}
                style={S.contactRow}
                onPress={() => Linking.openURL(`tel:${number.replace(/\s/g, '')}`)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 18, lineHeight: 24, marginRight: 10 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.contactLabel}>{label}</Text>
                  <Text style={S.contactNumber}>{number}</Text>
                </View>
                <Text style={{ color: BLUE, fontSize: 13, fontWeight: '700' }}>Call →</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Actions ────────────────────────────────────────────── */}
          <Section title="ACTIONS" />
          <View style={S.actionsRow}>

            {/* View on Map — uses mapActionStore to survive the navigation transition */}
            <TouchableOpacity
              style={S.actionBtn}
              onPress={() => {
                if (lat && lon) {
                  mapActionStore.setPending({
                    type:       'flyTo',
                    lat:        Number(lat),
                    lon:        Number(lon),
                    label:      d?.location_address ?? 'Disaster',
                    disasterId: d?.id ?? d?.disaster_id ?? disasterId,
                  });
                }
                navigation.navigate('Home' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={S.actionIcon}>🗺️</Text>
              <Text style={S.actionTxt}>View on Map</Text>
            </TouchableOpacity>

            {/* Evacuation Plans — shown for high-risk types */}
            {hasEvac && (
              <TouchableOpacity
                style={[S.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                onPress={() => navigation.navigate('EvacuationPlans' as any, { disasterId: d?.id ?? disasterId })}
                activeOpacity={0.8}
              >
                <Text style={S.actionIcon}>🚨</Text>
                <Text style={[S.actionTxt, { color: '#DC2626' }]}>Evacuation Plans</Text>
              </TouchableOpacity>
            )}

            {/* Report Disaster */}
            <TouchableOpacity
              style={[S.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => navigation.navigate('ReportDisaster')}
              activeOpacity={0.8}
            >
              <Text style={S.actionIcon}>📋</Text>
              <Text style={[S.actionTxt, { color: '#16A34A' }]}>Submit Report</Text>
            </TouchableOpacity>
          </View>

          {/* Reroute notice */}
          {hasRoadBlock && (
            <View style={S.rerouteNotice}>
              <Text style={{ fontSize: 18, lineHeight: 24 }}>🚧</Text>
              <Text style={S.rerouteNoticeTxt}>
                Roads are blocked near this disaster. Check the map for alternative routes.
              </Text>
            </View>
          )}

          {/* Footer note */}
          <Text style={S.footNote}>
            Information sourced from Disaster Response System. Always follow instructions
            from Gardaí, Fire Brigade and Civil Defence on the ground.
          </Text>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F7FF' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  hBtn:        { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Section label
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.9, marginBottom: 8, marginTop: 4,
  },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },

  // Hero card
  heroCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderTopWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  heroEmoji:   { fontSize: 40, lineHeight: 50 },
  heroType:    { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  heroRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroTime:    { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  pill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt: { fontSize: 11, fontWeight: '800' },

  // Row
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  rowLabel: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 2, textAlign: 'right' },

  // Map button
  mapBtn: {
    marginTop: 10, backgroundColor: BLUE + '12',
    borderRadius: 8, paddingVertical: 9,
    alignItems: 'center', borderWidth: 1, borderColor: BLUE + '30',
  },
  mapBtnTxt: { color: BLUE, fontWeight: '700', fontSize: 13 },

  // Description box
  descBox: {
    marginTop: 8, backgroundColor: '#F8FAFC',
    borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: BLUE,
  },
  descTxt: { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Safety advice
  adviceHeadline: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: BLUE + '0E', borderRadius: 10, padding: 10,
    marginBottom: 14, borderWidth: 1, borderColor: BLUE + '25',
  },
  adviceHeadlineTxt: {
    flex: 1, fontSize: 14, fontWeight: '700', color: NAVY, lineHeight: 20,
  },
  adviceSubhead: {
    fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8,
  },
  adviceStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6,
  },
  stepDot: {
    width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0,
  },
  adviceStepTxt: { fontSize: 13, color: '#374151', lineHeight: 19, flex: 1 },

  // Emergency contacts
  contactRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  contactLabel:  { fontSize: 13, color: '#374151', fontWeight: '600' },
  contactNumber: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  // Actions
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1, minWidth: '44%', alignItems: 'center', paddingVertical: 14,
    backgroundColor: BLUE + '0E', borderRadius: 12,
    borderWidth: 1, borderColor: BLUE + '30',
  },
  actionIcon: { fontSize: 22, lineHeight: 28, marginBottom: 4 },
  actionTxt:  { fontSize: 12, fontWeight: '700', color: BLUE },

  // Reroute notice
  rerouteNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 12,
  },
  rerouteNoticeTxt: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },

  footNote: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center',
    lineHeight: 16, paddingHorizontal: spacing.sm, marginTop: 4,
  },
});

export default DisasterAlertDetailScreen;