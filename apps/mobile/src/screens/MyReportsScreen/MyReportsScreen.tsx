import React, { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
} from 'react-native';
import { ReportsList } from '@organisms/ReportsList';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import type { Report } from '../../types/disaster';

const MOCK_REPORTS: Report[] = [
  {
    id: '1', reportNumber: 'DR-2025-1234', type: 'fire', severity: 'critical',
    title: 'Fire - Critical',
    location: { latitude: 53.3439, longitude: -6.2674, address: "O'Connell Street" },
    reportedAt: new Date(Date.now() - 15 * 60000),
    status: 'in_progress', reportedBy: 'You', unitsResponding: 3,
  },
  {
    id: '2', reportNumber: 'DR-2025-1240', type: 'accident', severity: 'medium',
    title: 'Accident - Medium',
    location: { latitude: 53.3406, longitude: -6.2603, address: 'Grafton Street' },
    reportedAt: new Date(Date.now() - 2 * 3600000),
    status: 'evaluating', reportedBy: 'You',
  },
  {
    id: '3', reportNumber: 'DR-2025-1198', type: 'flood', severity: 'high',
    title: 'Flood - High',
    location: { latitude: 53.3373, longitude: -6.2602, address: 'Temple Bar' },
    reportedAt: new Date(Date.now() - 24 * 3600000),
    status: 'resolved', reportedBy: 'You',
  },
];

type Tab = 'active' | 'resolved' | 'all';

export const MyReportsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('active');

  const filtered = MOCK_REPORTS.filter((r) => {
    if (tab === 'active') return r.status !== 'resolved';
    if (tab === 'resolved') return r.status === 'resolved';
    return true;
  });

  const activeCount = MOCK_REPORTS.filter((r) => r.status !== 'resolved').length;
  const resolvedCount = MOCK_REPORTS.filter((r) => r.status === 'resolved').length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4" color="textPrimary">My Reports</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'active' as Tab, label: `Active (${activeCount})` },
          { key: 'resolved' as Tab, label: `Resolved (${resolvedCount})` },
          { key: 'all' as Tab, label: `All (${MOCK_REPORTS.length})` },
        ]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              variant="bodyMedium"
              color={tab === t.key ? 'primary' : 'textSecondary'}
              style={tab === t.key ? styles.activeTabText : undefined}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text variant="labelLarge" color="textSecondary">
          {tab === 'active' ? 'ACTIVE REPORTS' : tab === 'resolved' ? 'RESOLVED REPORTS' : 'ALL REPORTS'}
        </Text>
      </View>

      <ReportsList reports={filtered} onPress={(id) => console.log('View report:', id)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: spacing.sm },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  activeTabText: { fontWeight: '600' },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.gray50 },
});

export default MyReportsScreen;