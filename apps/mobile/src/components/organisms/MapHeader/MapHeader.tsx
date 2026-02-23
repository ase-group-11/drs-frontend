import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@atoms/Text';
import { IconButton } from '@atoms/IconButton';
import { Avatar } from '@atoms/Avatar';
import { Badge } from '@atoms/Badge';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';

export interface MapHeaderProps {
  location: string;
  notificationCount?: number;
  userInitials: string;
  onMenuPress: () => void;
  onNotificationPress: () => void;
  onAvatarPress: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  location,
  notificationCount = 0,
  userInitials,
  onMenuPress,
  onNotificationPress,
  onAvatarPress,
}) => (
  <View style={styles.container}>
    <IconButton
      icon={
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 12h18M3 6h18M3 18h18"
            stroke={colors.textPrimary}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      }
      onPress={onMenuPress}
    />

    <View style={styles.location}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
          stroke={colors.primary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="10" r="3" stroke={colors.primary} strokeWidth="2" />
      </Svg>
      <Text variant="bodyMedium" color="textPrimary" style={styles.locText}>
        {location}
      </Text>
    </View>

    <View style={styles.right}>
      <View style={styles.notifWrap}>
        <IconButton
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke={colors.textPrimary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke={colors.textPrimary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          }
          onPress={onNotificationPress}
        />
        {notificationCount > 0 && (
          <Badge
            count={notificationCount}
            variant="error"
            size="small"
            style={styles.badge}
          />
        )}
      </View>
      <IconButton
        icon={<Avatar initials={userInitials} size="small" />}
        onPress={onAvatarPress}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  locText: { marginLeft: spacing.xs },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notifWrap: { position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0 },
});

export default MapHeader;