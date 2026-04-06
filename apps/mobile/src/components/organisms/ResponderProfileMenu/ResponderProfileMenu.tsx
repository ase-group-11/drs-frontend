// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/ResponderProfileMenu/ResponderProfileMenu.tsx
//
// Fixed:
//   - Uses useSafeAreaInsets for status bar / dynamic island padding
//   - Removed "OPERATIONS" and "REPORTING" section labels (flat list)
//   - Removed "Completed Missions" (already shown as "Done" tab in Active Missions)
//   - Emoji lineHeight fixes
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text }     from '@atoms/Text';
import { Avatar }   from '@atoms/Avatar';
import { MenuItem } from '@molecules/MenuItem';
import { spacing, borderRadius } from '@theme/spacing';

const RED      = '#DC2626';
const RED_DARK = '#991B1B';

const DEPT_LABELS: Record<string, string> = {
  fire:    '🔥 Fire',    FIRE:    '🔥 Fire',
  police:  '👮 Police',  POLICE:  '👮 Police',
  medical: '🏥 Medical', MEDICAL: '🏥 Medical',
  it:      '💻 IT',      IT:      '💻 IT',
};
const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',     ADMIN:   'Admin',
  manager: 'Manager',   MANAGER: 'Manager',
  staff:   'Responder', STAFF:   'Responder',
};

export interface ResponderProfileMenuProps {
  name:         string;
  email:        string;
  role:         string;
  department:   string;
  employeeId?:  string;
  initials:     string;
  missionCount?: number;
  onNavigate:   (screen: string) => void;
  onLogout:     () => void;
}

export const ResponderProfileMenu: React.FC<ResponderProfileMenuProps> = ({
  name, email, role, department, employeeId, initials,
  missionCount = 0,
  onNavigate, onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const deptLabel = DEPT_LABELS[department] ?? department ?? '🔥 Fire';
  const roleLabel = ROLE_LABELS[role]       ?? role       ?? 'Responder';

  const call999 = () => {
    Alert.alert('🚨 Emergency Call', 'Call 999 now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call 999', style: 'destructive', onPress: () => Linking.openURL('tel:999') },
    ]);
  };

  return (
    <View style={S.container}>

      {/* Red header — padded for notch / dynamic island */}
      <View style={[S.header, { paddingTop: insets.top + spacing.md }]}>
        <Avatar initials={initials} size="large" backgroundColor={RED_DARK} />
        <Text style={S.name}>{name}</Text>
        <View style={S.chips}>
          <View style={S.chip}><Text style={S.chipText}>{roleLabel}</Text></View>
          <View style={S.chip}><Text style={S.chipText}>{deptLabel}</Text></View>
        </View>
        <Text style={S.email}>{email}</Text>
        {employeeId ? <Text style={S.empId}>ID: {employeeId}</Text> : null}
      </View>

      {/* Active missions badge */}
      {missionCount > 0 && (
        <View style={S.dutyBar}>
          <View style={S.dutyDot} />
          <Text style={S.dutyText}>
            {missionCount} Active Mission{missionCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Flat menu — no section headers */}
        <View style={{ marginTop: spacing.sm }} />

        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🗺️</Text>}
          label="Command Map"
          onPress={() => onNavigate('Home')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🎯</Text>}
          label="Disaster Command"
          onPress={() => onNavigate('DisasterCommand')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>📋</Text>}
          label="Active Missions"
          badge={missionCount > 0 ? missionCount : undefined}
          onPress={() => onNavigate('ActiveMissions')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>👥</Text>}
          label="My Crew"
          onPress={() => onNavigate('MyCrew')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🚁</Text>}
          label="Evacuation Plans"
          onPress={() => onNavigate('EvacuationPlans')}
        />
        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🔔</Text>}
          label="Alerts"
          onPress={() => onNavigate('Alerts')}
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

        <View style={{ height: 8 }} />

        {/* Emergency 999 */}
        <TouchableOpacity style={S.emergBtn} onPress={call999} activeOpacity={0.85}>
          <Text style={S.emergText}>🚨  Emergency: 999</Text>
        </TouchableOpacity>

        <MenuItem
          icon={<Text style={{ fontSize: 18, lineHeight: 24 }}>🚪</Text>}
          label="Logout"
          textColor="error"
          showArrow={false}
          onPress={onLogout}
        />

        <View style={S.footer}>
          <Text style={S.footerText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: RED,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  name:     { color: '#fff', marginTop: spacing.md, fontSize: 18, fontWeight: '700' },
  chips:    { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  chip:     {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  email:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: spacing.xs },
  empId:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },

  dutyBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#FCA5A5',
  },
  dutyDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  dutyText: { flex: 1, fontSize: 13, fontWeight: '600', color: RED },

  emergBtn: {
    margin: spacing.lg, padding: spacing.md,
    backgroundColor: '#FEF2F2', borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center',
  },
  emergText: { color: RED, fontWeight: '700', fontSize: 15 },

  footer:     { paddingVertical: spacing.xl, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#9CA3AF' },
});

export default ResponderProfileMenu;