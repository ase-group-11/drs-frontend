// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/ProfileMenu/ProfileMenu.tsx
// FIXED: @/components/atoms/Text → @atoms/Text
//        Removed Switch Role / To Responder buttons
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Avatar } from '@atoms/Avatar';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';

export interface ProfileMenuProps {
  name: string;
  phone: string;
  role: string;
  initials: string;
  alertCount: number;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Individual menu row
// ─────────────────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  danger?: boolean;
  showArrow?: boolean;
  onPress: () => void;
}

const MenuRow: React.FC<MenuRowProps> = ({
  icon, label, badge, active, danger, showArrow = true, onPress,
}) => (
  <TouchableOpacity
    style={[styles.row, active && styles.rowActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.rowIcon, active && styles.rowIconActive]}>{icon}</View>
    <Text
      variant="bodyLarge"
      style={[styles.rowLabel, active && styles.rowLabelActive, danger && styles.rowLabelDanger]}
    >
      {label}
    </Text>
    <View style={styles.rowRight}>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text variant="caption" style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {showArrow && !danger && (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18l6-6-6-6"
            stroke={active ? colors.primary : colors.gray400}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────
const iconColor = (active?: boolean) => active ? colors.primary : colors.gray500;

const HomeIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ReportsIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AlertIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={iconColor(active)} strokeWidth="2" />
  </Svg>
);

const EvacuationIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={iconColor(active)} strokeWidth="2" />
    <Path d="M12 8v4l3 3" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={iconColor(active)} strokeWidth="2" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HelpIcon = ({ active }: { active?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={iconColor(active)} strokeWidth="2" />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 17h.01" stroke={iconColor(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LogoutIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17l5-5-5-5M21 12H9"
      stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────
export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  name, phone, role, initials, alertCount, onNavigate, onLogout,
}) => (
  <View style={styles.container}>
    {/* ── Blue header ── */}
    <SafeAreaView style={styles.headerSafe}>
      <View style={styles.header}>
        <Avatar initials={initials} size="large" backgroundColor={colors.navyLight} />
        <Text variant="h4" style={styles.name}>{name}</Text>
        <View style={styles.roleChip}>
          <Text variant="caption" style={styles.roleText}>{role}</Text>
        </View>
        <Text variant="bodyMedium" style={styles.phone}>{phone}</Text>
      </View>
    </SafeAreaView>

    {/* ── Menu items ── */}
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Group 1 */}
      <MenuRow icon={<HomeIcon />} label="Home / Live Map" onPress={() => onNavigate('Home')} />
      <MenuRow icon={<ReportsIcon />} label="My Reports" onPress={() => onNavigate('MyReports')} />
      <MenuRow icon={<AlertIcon />} label="Active Alerts" badge={alertCount} onPress={() => onNavigate('Alerts')} />

      <View style={styles.divider} />

      {/* Group 2 */}
      <MenuRow icon={<LocationIcon />} label="Saved Locations" onPress={() => onNavigate('SavedLocations')} />
      <MenuRow icon={<EvacuationIcon />} label="Evacuation Plans" onPress={() => onNavigate('EvacuationPlans')} />

      <View style={styles.divider} />

      {/* Group 3 */}
      <MenuRow icon={<SettingsIcon />} label="Settings" onPress={() => onNavigate('Settings')} />
      <MenuRow icon={<HelpIcon />} label="Help & Support" onPress={() => onNavigate('HelpSupport')} />

      <View style={styles.divider} />

      {/* Logout */}
      <MenuRow icon={<LogoutIcon />} label="Logout" danger showArrow={false} onPress={onLogout} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary" align="center">Version 1.0.0</Text>
        <Text variant="bodyMedium" style={styles.emergency} align="center">Emergency: 999</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  // Header
  headerSafe: { backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  name: { color: colors.white, marginTop: spacing.md },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  roleText: { color: colors.white },
  phone: { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },

  // Scroll
  scroll: { flex: 1 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.white,
  },
  rowActive: { backgroundColor: '#EBF5FF' },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowIconActive: { backgroundColor: '#DBEAFE' },
  rowLabel: { flex: 1, color: colors.textPrimary },
  rowLabelActive: { color: colors.primary, fontWeight: '600' },
  rowLabelDanger: { color: colors.error },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  // Badge
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  // Divider
  divider: { height: 8, backgroundColor: colors.gray50 },

  // Footer
  footer: { paddingVertical: spacing.massive, alignItems: 'center' },
  emergency: { color: colors.error, fontWeight: '600', marginTop: spacing.sm },
});

export default ProfileMenu;