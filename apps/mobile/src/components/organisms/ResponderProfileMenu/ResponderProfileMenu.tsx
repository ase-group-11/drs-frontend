// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/ResponderProfileMenu/ResponderProfileMenu.tsx
// Responder-specific sidebar menu with red theme
// Uses: GET /deployments/unit/{unit_id}/active for mission count
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from '@atoms/Text';
import { Avatar } from '@atoms/Avatar';
import { MenuItem } from '@molecules/MenuItem';
import { spacing, borderRadius } from '@theme/spacing';

const RED      = '#DC2626';
const RED_DARK = '#991B1B';
const RED_BG   = '#7F1D1D';

const DEPT_LABELS: Record<string, string> = {
  fire:    '🔥 Fire',
  police:  '👮 Police',
  medical: '🏥 Medical',
  it:      '💻 IT',
};

const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Manager',
  staff:   'Responder',
};

export interface ResponderProfileMenuProps {
  name:        string;
  email:       string;
  role:        string;         // admin | manager | staff
  department:  string;         // fire | police | medical | it
  employeeId?: string;
  initials:    string;
  missionCount?: number;
  onNavigate: (screen: string) => void;
  onLogout:   () => void;
}

export const ResponderProfileMenu: React.FC<ResponderProfileMenuProps> = ({
  name, email, role, department, employeeId, initials,
  missionCount = 0, onNavigate, onLogout,
}) => {
  const deptLabel = DEPT_LABELS[department?.toLowerCase()] ?? department;
  const roleLabel = ROLE_LABELS[role?.toLowerCase()] ?? role;

  return (
    <View style={S.container}>

      {/* Red header */}
      <View style={S.header}>
        <Avatar initials={initials} size="large" backgroundColor={RED_DARK} />
        <Text variant="h4" style={S.name}>{name}</Text>
        <View style={S.chips}>
          <View style={S.chip}><Text style={S.chipText}>{roleLabel}</Text></View>
          <View style={S.chip}><Text style={S.chipText}>{deptLabel}</Text></View>
        </View>
        <Text style={S.email}>{email}</Text>
        {employeeId && <Text style={S.empId}>ID: {employeeId}</Text>}
      </View>

      {/* Status bar */}
      <View style={S.statusBar}>
        <View style={S.statusDot} />
        <Text style={S.statusText}>On Duty</Text>
        {missionCount > 0 && (
          <View style={S.missionBadge}>
            <Text style={S.missionBadgeText}>{missionCount} active</Text>
          </View>
        )}
      </View>

      <ScrollView style={S.menu} showsVerticalScrollIndicator={false}>

        {/* Operations */}
        <Text style={S.sectionLabel}>OPERATIONS</Text>
        <MenuItem
          icon={<Text>🗺️</Text>}
          label="Command Map"
          onPress={() => onNavigate('Home')}
        />
        <MenuItem
          icon={<Text>📋</Text>}
          label="Active Missions"
          badge={missionCount > 0 ? missionCount : undefined}
          onPress={() => onNavigate('ActiveMissions')}
        />
        <MenuItem
          icon={<Text>📊</Text>}
          label="Mission Progress"
          onPress={() => onNavigate('MissionProgress')}
        />

        <View style={S.divider} />

        {/* Reporting */}
        <Text style={S.sectionLabel}>REPORTING</Text>
        <MenuItem
          icon={<Text>⚠️</Text>}
          label="Report Incident"
          onPress={() => onNavigate('ReportDisaster')}
        />
        <MenuItem
          icon={<Text>📄</Text>}
          label="My Submitted Reports"
          onPress={() => onNavigate('MyReports')}
        />

        <View style={S.divider} />

        {/* General */}
        <MenuItem icon={<Text>⚙️</Text>} label="Settings"     onPress={() => onNavigate('Settings')} />
        <MenuItem icon={<Text>❓</Text>} label="Help & Support" onPress={() => onNavigate('HelpSupport')} />

        <View style={S.divider} />

        {/* Emergency */}
        <TouchableOpacity style={S.emergencyBtn} onPress={() => Linking.openURL('tel:999')}>
          <Text style={S.emergencyText}>🚨  Emergency: 999</Text>
        </TouchableOpacity>

        <MenuItem
          icon={<Text>🚪</Text>}
          label="Logout"
          textColor="error"
          showArrow={false}
          onPress={onLogout}
        />

        <View style={{ paddingBottom: spacing.massive }} />
      </ScrollView>
    </View>
  );
};

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: RED,
    paddingTop:       spacing.xl,
    paddingBottom:    spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  name:  { color: '#fff', marginTop: spacing.md, fontSize: 18, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  chip:  {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xxs,
    borderRadius:      borderRadius.sm,
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  email:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: spacing.xs },
  empId:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    gap: spacing.xs,
  },
  statusDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  statusText: { fontSize: 13, fontWeight: '600', color: RED, flex: 1 },
  missionBadge: {
    backgroundColor: RED,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  missionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  menu:         { flex: 1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.xs,
  },
  divider: { height: 8, backgroundColor: '#F9FAFB' },

  emergencyBtn: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  emergencyText: { color: RED, fontWeight: '700', fontSize: 15 },
});

export default ResponderProfileMenu;