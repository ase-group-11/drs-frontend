// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/MapHeader/MapHeader.tsx
// FIXED - Proper layout with SafeArea constraints
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';

interface MapHeaderProps {
  location: string;
  notificationCount?: number;
  userInitials?: string;
  onMenuPress: () => void;
  onNotificationPress: () => void;
  onAvatarPress: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  location,
  notificationCount = 0,
  userInitials = 'JD',
  onMenuPress,
  onNotificationPress,
  onAvatarPress,
}) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Left: Menu Button (3 lines) */}
        <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 12h18M3 6h18M3 18h18"
              stroke={colors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Center: Location */}
        <View style={styles.locationContainer}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 13a3 3 0 100-6 3 3 0 000 6z"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text variant="bodyMedium" color="textPrimary" style={styles.locationText}>
            {location}
          </Text>
        </View>

        {/* Right: Notification + Profile */}
        <View style={styles.rightContainer}>
          {/* Notification Bell */}
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
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

          {/* Profile Avatar */}
          <TouchableOpacity style={styles.avatar} onPress={onAvatarPress}>
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
  
  // Left Menu Button
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  
  // Center Location
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
  
  // Right Container
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  // Notification Badge
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
  
  // Profile Avatar
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