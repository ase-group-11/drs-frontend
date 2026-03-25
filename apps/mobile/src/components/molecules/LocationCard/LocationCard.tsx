import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import type { SavedLocation } from '../../../types/disaster';

export interface LocationCardProps {
  location: SavedLocation;
  onViewMap: () => void;
  onEdit: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onViewMap,
  onEdit,
}) => {
  const hasAlert = location.alertCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <RNText style={styles.emoji}>{location.emoji}</RNText>
      </View>

      <Text variant="h5" color="textPrimary">{location.name}</Text>
      <Text variant="bodyMedium" color="textSecondary" style={styles.addr}>
        {location.address}
      </Text>
      <Text variant="bodySmall" color="textSecondary">{location.city}</Text>

      <View style={[styles.alertRow, { backgroundColor: hasAlert ? '#FFF5F0' : colors.successBg }]}>
        <RNText style={styles.alertIcon}>{hasAlert ? '⚠️' : '✅'}</RNText>
        <Text
          variant="caption"
          color={hasAlert ? 'coral' : 'success'}
          style={styles.alertText}
        >
          {hasAlert
            ? `${location.alertCount} Alert nearby • 500m away`
            : 'Active Alerts: None'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="📍 View on Map"
          variant="outline"
          size="small"
          fullWidth={false}
          style={styles.actionBtn}
          onPress={onViewMap}
        />
        <Button
          title="✏️  Edit"
          variant="ghost"
          size="small"
          fullWidth={false}
          style={styles.actionBtn}
          onPress={onEdit}
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
    ...shadows.sm,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 32 },
  addr: { marginTop: spacing.xs },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  alertIcon: { fontSize: 14 },
  alertText: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});

export default LocationCard;