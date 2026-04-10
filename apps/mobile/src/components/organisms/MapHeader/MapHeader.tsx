// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/MapHeader/MapHeader.tsx
// FIXED: SafeAreaView from react-native-safe-area-context (not react-native)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';

interface MapHeaderProps {
  location: string;
  notificationCount?: number;
  userInitials?: string;
  avatarColor?: string;
  onMenuPress: () => void;
  onNotificationPress: () => void;
  onAvatarPress: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  location,
  notificationCount = 0,
  userInitials = 'JD',
  avatarColor,
  onMenuPress,
  onNotificationPress,
  onAvatarPress,
}) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.iconButton} onPress={onMenuPress} activeOpacity={0.7}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 12h18M3 6h18M3 18h18"
              stroke={colors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>

        <View style={styles.locationContainer}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
              stroke={avatarColor ?? colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 13a3 3 0 100-6 3 3 0 000 6z"
              stroke={avatarColor ?? colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text variant="bodyMedium" color="textPrimary" style={styles.locationText}>
            {location}
          </Text>
        </View>

        <View style={styles.rightContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress} activeOpacity={0.7}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                stroke={colors.textPrimary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text variant="caption" color="white" style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatar, avatarColor ? { backgroundColor: avatarColor } : {}]}
            onPress={onAvatarPress}
            activeOpacity={0.7}
          >
            <Text variant="bodyMedium" color="white" style={styles.avatarText}>
              {userInitials}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 56,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  locationText: {
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default MapHeader;