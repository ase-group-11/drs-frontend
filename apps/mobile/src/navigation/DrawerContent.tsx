// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/DrawerContent.tsx
// Left drawer menu with all options
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { authService } from '@services/authService';
import { notificationService } from '@services/notificationService';

interface DrawerContentProps {
  navigation: any;
  state: any;
}

// Menu item component
const DrawerItem = ({ 
  icon, 
  label, 
  onPress, 
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onPress: () => void; 
  active?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.drawerItem, active && styles.drawerItemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.iconContainer}>{icon}</View>
    <Text 
      variant="bodyMedium" 
      style={[styles.drawerLabel, active && styles.drawerLabelActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export const DrawerContent: React.FC<DrawerContentProps> = ({ navigation, state }) => {
  const currentRoute = state.routes[state.index]?.name;
  const [user, setUser] = useState<any>(null);
  const [isResponder, setIsResponder] = useState(false);

  useEffect(() => {
    authService.getStoredUser().then(u => {
      setUser(u);
      // Check role from AsyncStorage
      const role = (u as any)?.role ?? '';
      setIsResponder(role === 'responder' || role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF');
    }).catch(() => {});
    AsyncStorage.getItem('@auth/user_role').then(role => {
      if (role === 'responder') setIsResponder(true);
    }).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await notificationService.cleanup();
            await authService.logout();
            // Navigation will automatically go to Login screen
            // because App.tsx checks for token
          },
        },
      ]
    );
  };

  return (
    <DrawerContentScrollView style={styles.container} bounces={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text variant="h2" style={styles.avatarText}>{initials}</Text>
        </View>
        <Text variant="h3" style={styles.userName}>{user?.full_name ?? 'User'}</Text>
        <Text variant="bodySmall" color="textSecondary">{user?.email ?? ''}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                stroke={currentRoute === 'Home' ? colors.primary : colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          }
          label="Home"
          onPress={() => navigation.navigate('Home')}
          active={currentRoute === 'Home'}
        />

        {/* My Reports — citizen only */}
        {!isResponder && (
          <DrawerItem
            icon={
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke={currentRoute === 'MyReports' ? colors.primary : colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                  stroke={currentRoute === 'MyReports' ? colors.primary : colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            }
            label="My Reports"
            onPress={() => navigation.navigate('MyReports')}
            active={currentRoute === 'MyReports'}
          />
        )}

        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke={currentRoute === 'Alerts' ? colors.primary : colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke={currentRoute === 'Alerts' ? colors.primary : colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          }
          label="Alerts"
          onPress={() => navigation.navigate('Alerts')}
          active={currentRoute === 'Alerts'}
        />

        {/* Responder-only items */}
        {isResponder && (
          <>
            <DrawerItem
              icon={
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                    stroke={currentRoute === 'ActiveMissions' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                    stroke={currentRoute === 'ActiveMissions' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" />
                </Svg>
              }
              label="Active Missions"
              onPress={() => navigation.navigate('ActiveMissions')}
              active={currentRoute === 'ActiveMissions'}
            />
            <DrawerItem
              icon={
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    stroke={currentRoute === 'MyCrew' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx="9" cy="7" r="4"
                    stroke={currentRoute === 'MyCrew' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" />
                </Svg>
              }
              label="My Crew"
              onPress={() => navigation.navigate('MyCrew')}
              active={currentRoute === 'MyCrew'}
            />
            <DrawerItem
              icon={
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M22 12h-4l-3 9L9 3l-3 9H2"
                    stroke={currentRoute === 'UnitStatus' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              }
              label="Unit Status"
              onPress={() => navigation.navigate('UnitStatus')}
              active={currentRoute === 'UnitStatus'}
            />
            <DrawerItem
              icon={
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                    stroke={currentRoute === 'EvacuationPlans' ? '#DC2626' : colors.textSecondary}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              }
              label="Evacuation Plans"
              onPress={() => navigation.navigate('EvacuationPlans')}
              active={currentRoute === 'EvacuationPlans'}
            />
          </>
        )}

        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke={currentRoute === 'Profile' ? colors.primary : colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle
                cx="12"
                cy="7"
                r="4"
                stroke={currentRoute === 'Profile' ? colors.primary : colors.textSecondary}
                strokeWidth="2"
              />
            </Svg>
          }
          label="Profile"
          onPress={() => navigation.navigate('Profile')}
          active={currentRoute === 'Profile'}
        />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Settings Section */}
      <View style={styles.menuSection}>
        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="3" stroke={colors.textSecondary} strokeWidth="2" />
              <Path
                d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"
                stroke={colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Svg>
          }
          label="Settings"
          onPress={() => navigation.navigate('Settings')}
        />

        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke={colors.textSecondary} strokeWidth="2" />
              <Path
                d="M12 16v-4M12 8h.01"
                stroke={colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Svg>
          }
          label="Help & Support"
          onPress={() => navigation.navigate('HelpSupport')}
        />

        <DrawerItem
          icon={
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                stroke={colors.error}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M16 17l5-5-5-5M21 12H9"
                stroke={colors.error}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          }
          label="Logout"
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary" style={styles.footerText}>
          Version 1.0.0
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={styles.footerText}>
          © 2026 Disaster Response
        </Text>
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
  },
  userName: {
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  menuSection: {
    paddingHorizontal: spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  drawerItemActive: {
    backgroundColor: `${colors.primary}10`,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  drawerLabel: {
    flex: 1,
  },
  drawerLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    marginBottom: spacing.xs,
  },
});

export default DrawerContent;