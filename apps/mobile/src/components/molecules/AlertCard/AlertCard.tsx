import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import type { Alert } from '../../../types/disaster';

export interface AlertCardProps {
  alert: Alert;
  onViewDetails: () => void;
  onGetDirections: () => void;
}

const getSeverityColor = (s: string) =>
  ({ critical: colors.error, high: colors.coral, medium: colors.warning, low: colors.primary }[s] ?? colors.gray500);

const getTimeAgo = (date: Date) => {
  const m = Math.floor((Date.now() - date.getTime()) / 60000);
  if (m < 60) return `${m} min${m !== 1 ? 's' : ''} ago`;
  return `${Math.floor(m / 60)} hr ago`;
};

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onViewDetails,
  onGetDirections,
}) => {
  const sc = getSeverityColor(alert.severity);
  const isCritical = alert.severity === 'critical';
  const typeIcon = { evacuation: '🔴', warning: '⚠️', advisory: 'ℹ️' }[alert.type];

  return (
    <View
      style={[
        styles.card,
        isCritical && styles.criticalBorder,
      ]}
    >
      {!alert.isRead && <View style={styles.unread} />}

      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: sc }]}>
          <Text style={styles.typeIcon}>{typeIcon}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text variant="h5" color="error">{alert.title}</Text>
          <Text variant="bodyMedium" color="textPrimary">{alert.disasterType}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
            stroke={colors.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="10" r="3" stroke={colors.textSecondary} strokeWidth="2" />
        </Svg>
        <Text variant="bodySmall" color="textSecondary" style={styles.locText}>
          {alert.location.name}
        </Text>
        <View style={[styles.distBadge, { backgroundColor: colors.error }]}>
          <Text variant="caption" color="white">{alert.distance}</Text>
        </View>
      </View>

      <Text variant="bodyMedium" color="textPrimary" style={styles.message}>
        {alert.message}
      </Text>
      <Text variant="bodySmall" color="textSecondary" style={styles.time}>
        {getTimeAgo(alert.issuedAt)}
      </Text>

      {/* Mini map placeholder */}
      <View style={styles.miniMap}>
        <View style={[styles.miniMarker, { backgroundColor: sc }]}>
          <Text style={styles.mapPin}>📍</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="View Details →"
          variant="primary"
          size="medium"
          style={{ backgroundColor: colors.error }}
          onPress={onViewDetails}
        />
        <Button
          title="↗  Get Directions"
          variant="outline"
          size="medium"
          onPress={onGetDirections}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    ...shadows.sm,
  },
  criticalBorder: { borderLeftWidth: 4, borderLeftColor: colors.error },
  unread: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  header: { flexDirection: 'row', marginBottom: spacing.md },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  typeIcon: { fontSize: 22 },
  headerInfo: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  locText: { flex: 1, marginLeft: spacing.xs },
  distBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  message: { marginBottom: spacing.sm },
  time: { marginBottom: spacing.md },
  miniMap: {
    height: 120,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMarker: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mapPin: { fontSize: 20 },
  actions: { gap: spacing.sm },
});

export default AlertCard;