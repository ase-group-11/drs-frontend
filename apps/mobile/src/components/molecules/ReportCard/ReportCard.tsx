import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { StatusDot } from '@atoms/StatusDot';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import type { Report, ReportStatus } from '../../../types/disaster';

export interface ReportCardProps {
  report: Report;
  onPress: () => void;
}

// Extended to cover all backend report_status values
const STATUS_CONFIG: Record<string, { color: string; label: string; borderColor: string }> = {
  // Backend values
  pending:     { color: colors.warning,  label: 'Pending Review', borderColor: colors.warning },
  verified:    { color: colors.primary,  label: 'Verified',       borderColor: colors.primary },
  active:      { color: colors.error,    label: 'Active Response',borderColor: colors.error },
  resolved:    { color: colors.success,  label: 'Resolved',       borderColor: colors.gray200 },
  rejected:    { color: colors.gray500,  label: 'Not Actioned',   borderColor: colors.gray200 },
  // Legacy frontend values (keep for compatibility)
  in_progress: { color: colors.coral,   label: 'In Progress',    borderColor: colors.error },
  evaluating:  { color: colors.warning, label: 'Evaluating',     borderColor: colors.warning },
};

const DISASTER_ICONS: Record<string, string> = {
  // lowercase keys — matches DisasterType
  flood: '🌊', fire: '🔥', earthquake: '🏚️', hurricane: '🌀',
  tornado: '🌪️', tsunami: '🌊', drought: '☀️', heatwave: '🌡️',
  coldwave: '🥶', storm: '⛈️', other: '⚠️',
  // UPPERCASE variants for API responses
  FLOOD: '🌊', FIRE: '🔥', EARTHQUAKE: '🏚️', HURRICANE: '🌀',
  TORNADO: '🌪️', TSUNAMI: '🌊', DROUGHT: '☀️', HEATWAVE: '🌡️',
  COLDWAVE: '🥶', STORM: '⛈️', OTHER: '⚠️',
};

const getTimeAgo = (date: Date): string => {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onPress }) => {
  const statusKey = (report.status ?? 'pending').toLowerCase();
  const typeKey   = (report.type  ?? 'other').toLowerCase();
  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <RNText style={styles.icon}>{DISASTER_ICONS[typeKey] ?? '📍'}</RNText>
          <View style={styles.info}>
            <Text variant="labelMedium" color="textSecondary">{report.reportNumber}</Text>
            <Text variant="h5" color="textPrimary" style={styles.title}>{report.title}</Text>
            <Text variant="bodyMedium" color="textSecondary">{report.location.address}</Text>
          </View>
        </View>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18l6-6-6-6"
            stroke={colors.gray500}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary">{getTimeAgo(report.reportedAt)}</Text>

        <View style={styles.statusBadge}>
          <StatusDot color={cfg.color} size={8} />
          <Text
            variant="bodySmall"
            style={{ color: cfg.color, marginLeft: spacing.xs }}
          >
            Status: {cfg.label}
          </Text>
        </View>

        {report.unitsResponding ? (
          <Text variant="caption" color="error">
            🚒 {report.unitsResponding} units responding
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { fontSize: 32, marginRight: spacing.md },
  info: { flex: 1 },
  title: { marginTop: spacing.xxs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
});

export default ReportCard;