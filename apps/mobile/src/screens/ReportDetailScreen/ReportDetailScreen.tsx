// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ReportDetailScreen/ReportDetailScreen.tsx
// Shows full details of a submitted disaster report
// API: GET /disaster-reports/{report_id}
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import { disasterService } from '@services/disasterService';
import { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN } from '@env';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

MapboxGL.setAccessToken(EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);

// ─── Types ────────────────────────────────────────────────────────────────
interface ReportDetail {
  id: string;
  disaster_type: string;
  severity: string;
  description: string;
  location_address: string;
  latitude: number;
  longitude: number;
  people_affected: number;
  multiple_casualties: boolean;
  structural_damage: boolean;
  road_blocked: boolean;
  report_status: string;
  disaster_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  photo_count: number;
}

// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string; description: string }> = {
  pending:   { color: colors.warning, label: 'Pending Review',    icon: '🕐', description: 'Your report is awaiting review by our emergency team' },
  verified:  { color: colors.primary, label: 'Verified',          icon: '✅', description: 'Your report has been verified and emergency services are being dispatched' },
  rejected:  { color: colors.gray500, label: 'Rejected',          icon: '❌', description: 'This report was not actioned — see reason below' },
  active:    { color: colors.error,   label: 'Active Response',   icon: '🚒', description: 'Emergency services are actively responding to this incident' },
  resolved:  { color: colors.success, label: 'Resolved',          icon: '✓',  description: 'This incident has been resolved' },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3B82F6', medium: '#EAB308', high: '#F97316', critical: '#EF4444',
};

const TYPE_EMOJI: Record<string, string> = {
  fire:       '🔥',
  flood:      '🌊',
  storm:      '⛈️',
  earthquake: '🏚️',
  hurricane:  '🌀',
  tornado:    '🌪️',
  tsunami:    '🌊',
  drought:    '☀️',
  heatwave:   '🌡️',
  coldwave:   '🥶',
  other:      '⚠️',
};

const getEmoji = (type: string) => TYPE_EMOJI[type?.toLowerCase()] ?? '⚠️';

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Component ────────────────────────────────────────────────────────────
export const ReportDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const reportId   = route.params?.reportId as string;

  const [report, setReport]   = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { loadReport(); }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await disasterService.getReport(reportId) as any;

      // Backend returns location as object: { lat, lon } or flat fields
      const lat = data.latitude  ?? data.location?.lat  ?? 53.3498;
      const lon = data.longitude ?? data.location?.lon  ?? -6.2603;

      setReport({
        id:                data.id,
        disaster_type:     data.disaster_type ?? 'other',
        severity:          data.severity ?? 'medium',
        description:       data.description ?? 'No description provided',
        location_address:  data.location_address ?? data.location?.address ?? 'Unknown location',
        latitude:          lat,
        longitude:         lon,
        people_affected:   data.people_affected ?? 0,
        multiple_casualties: data.multiple_casualties ?? false,
        structural_damage:   data.structural_damage ?? false,
        road_blocked:        data.road_blocked ?? false,
        report_status:       (data.report_status ?? data.status ?? 'pending').toLowerCase(),
        disaster_id:         data.disaster_id ?? null,
        rejection_reason:    data.rejection_reason ?? null,
        created_at:          data.created_at ?? new Date().toISOString(),
        photo_count:         data.photo_count ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <BackArrow />
          </TouchableOpacity>
          <Text variant="h4">Report Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading report...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <BackArrow />
          </TouchableOpacity>
          <Text variant="h4">Report Details</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.center}>
          <Text variant="bodyLarge" color="error" style={{ textAlign: 'center' }}>
            {error ?? 'Report not found'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadReport}>
            <Text variant="bodyMedium" color="primary">Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg   = STATUS_CONFIG[report.report_status] ?? STATUS_CONFIG.pending;
  const severityClr = SEVERITY_COLORS[report.severity?.toLowerCase()] ?? colors.warning;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <BackArrow />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Report Details</Text>
          <Text variant="bodySmall" color="textSecondary">
            #{report.id.substring(0, 8).toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={loadReport}>
          <RefreshIcon />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusCfg.color + '18', borderColor: statusCfg.color }]}>
          <Text style={{ fontSize: 28, lineHeight: 36 }}>{statusCfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="h5" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
            <Text variant="bodySmall" color="textSecondary">{statusCfg.description}</Text>
          </View>
        </View>

        {/* Rejection reason */}
        {report.report_status === 'rejected' && report.rejection_reason && (
          <View style={styles.rejectionCard}>
            <Text variant="bodySmall" color="textSecondary">Reason:</Text>
            <Text variant="bodyMedium" color="error">{report.rejection_reason}</Text>
          </View>
        )}

        {/* Type + Severity */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={{ fontSize: 40, lineHeight: 52 }}>{getEmoji(report.disaster_type)}</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text variant="h4" color="textPrimary">
                {report.disaster_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <View style={[styles.severityBadge, { backgroundColor: severityClr + '20' }]}>
                <View style={[styles.severityDot, { backgroundColor: severityClr }]} />
                <Text style={{ color: severityClr, fontWeight: '700', fontSize: 12 }}>
                  {report.severity.toUpperCase()} SEVERITY
                </Text>
              </View>
            </View>
          </View>
          <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.sm }}>
            Reported {formatDate(report.created_at)}
          </Text>
        </View>

        {/* Map */}
        <View style={styles.mapCard}>
          <MapboxGL.MapView
            style={styles.map}
            styleURL="mapbox://styles/mapbox/streets-v12"
            logoEnabled={false}
            attributionEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <MapboxGL.Camera
              centerCoordinate={[report.longitude, report.latitude]}
              zoomLevel={14}
              animationDuration={0}
            />
            <MapboxGL.MarkerView
              id="pin"
              coordinate={[report.longitude, report.latitude]}
            >
              <View style={styles.pin}>
                <Text style={{ fontSize: 24, lineHeight: 32 }}>{getEmoji(report.disaster_type)}</Text>
              </View>
            </MapboxGL.MarkerView>
          </MapboxGL.MapView>
          <View style={styles.addressRow}>
            <PinIcon />
            <Text variant="bodyMedium" color="textPrimary" style={{ flex: 1, marginLeft: spacing.xs }}>
              {report.location_address}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text variant="labelLarge" color="textSecondary" style={styles.cardLabel}>DESCRIPTION</Text>
          <Text variant="bodyMedium" color="textPrimary">{report.description}</Text>
        </View>

        {/* Impact Details */}
        <View style={styles.card}>
          <Text variant="labelLarge" color="textSecondary" style={styles.cardLabel}>IMPACT</Text>
          <View style={styles.impactGrid}>
            <ImpactItem
              icon="👥"
              label="People Affected"
              value={report.people_affected > 0 ? String(report.people_affected) : 'Unknown'}
            />
            <ImpactItem
              icon="🏥"
              label="Casualties"
              value={report.multiple_casualties ? 'Yes' : 'No'}
              alert={report.multiple_casualties}
            />
            <ImpactItem
              icon="🏗️"
              label="Structural Damage"
              value={report.structural_damage ? 'Yes' : 'No'}
              alert={report.structural_damage}
            />
            <ImpactItem
              icon="🚧"
              label="Road Blocked"
              value={report.road_blocked ? 'Yes' : 'No'}
              alert={report.road_blocked}
            />
          </View>
        </View>

        {/* Photos */}
        {report.photo_count > 0 && (
          <View style={styles.card}>
            <Text variant="labelLarge" color="textSecondary" style={styles.cardLabel}>
              PHOTOS ({report.photo_count})
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              Photos attached to this report
            </Text>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text variant="labelLarge" color="textSecondary" style={styles.cardLabel}>
            STATUS TIMELINE
          </Text>
          <TimelineItem
            done={true}
            label="Report Submitted"
            time={formatDate(report.created_at)}
          />
          <TimelineItem
            done={['verified', 'active', 'resolved'].includes(report.report_status)}
            active={report.report_status === 'pending'}
            label="Under Review"
            time={report.report_status === 'pending' ? 'In progress...' : undefined}
          />
          <TimelineItem
            done={['active', 'resolved'].includes(report.report_status)}
            active={report.report_status === 'verified'}
            label="Emergency Services Dispatched"
          />
          <TimelineItem
            done={report.report_status === 'resolved'}
            active={report.report_status === 'active'}
            label="Incident Resolved"
            last
          />
        </View>

        {/* Linked disaster ID — shown only when report is verified */}
        {report.disaster_id && (
          <View style={styles.card}>
            <Text variant="labelLarge" color="textSecondary" style={styles.cardLabel}>LINKED DISASTER</Text>
            <Text variant="bodyMedium" color="primary">
              Disaster ID: #{report.disaster_id.substring(0, 8).toUpperCase()}
            </Text>
            <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.xs }}>
              Your report contributed to the verified disaster record
            </Text>
          </View>
        )}

        {/* Track Report Status — always visible */}
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => navigation.navigate('DisasterTimeline' as any, { reportId: report.id })}
          activeOpacity={0.8}
        >
          <Text style={styles.trackBtnTxt}>📋  Track Report Status</Text>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────

const BackArrow = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7"
      stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RefreshIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M1 4v6h6M23 20v-6h-6"
      stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"
      stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PinIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={colors.primary} strokeWidth="2" />
  </Svg>
);

interface ImpactItemProps { icon: string; label: string; value: string; alert?: boolean; }
const ImpactItem: React.FC<ImpactItemProps> = ({ icon, label, value, alert }) => (
  <View style={styles.impactItem}>
    <Text style={{ fontSize: 20, lineHeight: 26 }}>{icon}</Text>
    <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>{label}</Text>
    <Text variant="bodyMedium" style={{ color: alert ? colors.error : colors.textPrimary, fontWeight: '600' }}>
      {value}
    </Text>
  </View>
);

interface TimelineItemProps { done: boolean; active?: boolean; label: string; time?: string; last?: boolean; }
const TimelineItem: React.FC<TimelineItemProps> = ({ done, active, label, time, last }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineLeft}>
      <View style={[
        styles.timelineDot,
        done  && styles.timelineDotDone,
        active && styles.timelineDotActive,
      ]}>
        {done && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
        {active && <View style={styles.timelinePulse} />}
      </View>
      {!last && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
    </View>
    <View style={styles.timelineContent}>
      <Text variant="bodyMedium" style={{ color: done || active ? colors.textPrimary : colors.textSecondary }}>
        {label}
      </Text>
      {time && <Text variant="bodySmall" color="textSecondary">{time}</Text>}
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  retryBtn: { marginTop: spacing.md, padding: spacing.md },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, marginBottom: spacing.md,
  },

  rejectionCard: {
    padding: spacing.md, backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md, marginBottom: spacing.md,
    borderLeftWidth: 4, borderLeftColor: colors.error,
  },

  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  cardRow:    { flexDirection: 'row', alignItems: 'center' },
  cardLabel:  { marginBottom: spacing.sm, letterSpacing: 0.5 },

  severityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },

  mapCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    overflow: 'hidden', marginBottom: spacing.md, ...shadows.sm,
  },
  map:        { height: 160 },
  addressRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.xs,
  },

  pin: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.error,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },

  impactGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  impactItem:  {
    width: '47%', padding: spacing.md, backgroundColor: colors.gray50,
    borderRadius: borderRadius.md, alignItems: 'center',
  },

  // Timeline
  timelineBtn:    {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  timelineBtnTxt: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  timelineRow:     { flexDirection: 'row', marginBottom: spacing.md },
  timelineLeft:    { alignItems: 'center', marginRight: spacing.md, width: 24 },
  timelineDot:     {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.gray200, borderWidth: 2,
    borderColor: colors.gray300, justifyContent: 'center', alignItems: 'center',
  },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: { backgroundColor: colors.white, borderColor: colors.primary, borderWidth: 3 },
  timelinePulse:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  timelineLine:    { width: 2, flex: 1, backgroundColor: colors.gray200, marginTop: 4 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineContent: { flex: 1, paddingBottom: spacing.md },

  trackBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trackBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ReportDetailScreen;