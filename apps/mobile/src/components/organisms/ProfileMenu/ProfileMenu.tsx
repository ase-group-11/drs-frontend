// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/ProfileMenu/ProfileMenu.tsx
// Fixed: uses useSafeAreaInsets for status bar / notch padding
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@atoms/Avatar';
import { Text } from '@/components/atoms/Text';
import { MenuItem } from '@molecules/MenuItem';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';

export interface ProfileMenuProps {
  name: string;
  phone: string;
  role: string;
  initials: string;
  alertCount: number;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  name, phone, role, initials, alertCount, onNavigate, onLogout,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header — padded for notch / dynamic island */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Avatar initials={initials} size="large" backgroundColor={colors.navyLight} />
        <Text variant="h4" color="white" style={styles.name}>{name}</Text>
        <View style={styles.roleChip}>
          <Text variant="caption" color="white">{role}</Text>
        </View>
        <Text variant="bodyMedium" color="white" style={styles.phone}>{phone}</Text>
      </View>

      {/* Menu */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🏠</Text>}
          label="Home / Live Map"
          onPress={() => onNavigate('Home')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>📄</Text>}
          label="My Reports"
          onPress={() => onNavigate('MyReports')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>⚠️</Text>}
          label="Active Alerts"
          badge={alertCount}
          onPress={() => onNavigate('Alerts')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🗺️</Text>}
          label="Evacuation Plans"
          onPress={() => onNavigate('EvacuationPlans')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>⚙️</Text>}
          label="Settings"
          onPress={() => onNavigate('Settings')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>❓</Text>}
          label="Help & Support"
          onPress={() => onNavigate('HelpSupport')}
        />

        <View style={styles.divider} />

        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🚪</Text>}
          label="Logout"
          textColor="error"
          showArrow={false}
          onPress={onLogout}
        />

        <View style={styles.footer}>
          <Text variant="bodySmall" color="textSecondary" align="center">
            Version 1.0.0
          </Text>
          <Text variant="bodyMedium" color="error" align="center" style={styles.emergency}>
            Emergency: 999
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.primary,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  name: { marginTop: spacing.md },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  phone: { marginTop: spacing.xs },
  menu: { flex: 1 },
  divider: { height: 8, backgroundColor: colors.gray50 },
  footer: { paddingVertical: spacing.massive, alignItems: 'center' },
  emergency: { marginTop: spacing.sm, fontWeight: '600' },
});

export default ProfileMenu;