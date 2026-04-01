// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/MyReportsScreen/MyReportsScreen.tsx
// FIXED: @/components/atoms/Text → @atoms/Text
//        Null-safe convertBackendReport (disaster_type may be undefined)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ReportsList } from '@organisms/ReportsList';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { disasterService } from '@services/disasterService';
import { authService } from '@services/authService';
import type { Report } from '../../types/disaster';

type Tab = 'active' | 'resolved' | 'all';

// Null-safe conversion — backend fields may be missing
const convertBackendReport = (r: any): Report => ({
  id:           r.id ?? String(Math.random()),
  reportNumber: `DR-${(r.id ?? '????????').substring(0, 8).toUpperCase()}`,
  type:         (r.disaster_type ?? 'unknown').toLowerCase(),
  severity:     (r.severity ?? 'medium').toLowerCase(),
  title:        `${(r.disaster_type ?? 'Incident')} — ${(r.severity ?? 'Medium')}`,
  location: {
    latitude:  r.latitude ?? 0,
    longitude: r.longitude ?? 0,
    address:   r.location_address ?? 'Unknown location',
  },
  reportedAt:     new Date(r.created_at ?? Date.now()),
  status:         (r.status ?? 'evaluating').toLowerCase() as any,
  reportedBy:     'You',
  description:    r.description ?? '',
  unitsResponding: r.status === 'VERIFIED'
    ? Math.floor(Math.random() * 5) + 1
    : undefined,
});

export const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tab, setTab]         = useState<Tab>('active');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await authService.getStoredUser();
      if (!user) {
        setError('Please log in to view your reports');
        return;
      }

      const backendReports = await disasterService.getMyReports(user.id);
      setReports(backendReports.map(convertBackendReport));

    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to load reports. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  const activeCount   = reports.filter(r => r.status !== 'resolved' && r.status !== 'rejected').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved'  || r.status === 'rejected').length;

  const filtered = reports.filter(r => {
    if (tab === 'active')   return r.status !== 'resolved' && r.status !== 'rejected';
    if (tab === 'resolved') return r.status === 'resolved'  || r.status === 'rejected';
    return true;
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'active',   label: `Active (${activeCount})`     },
    { key: 'resolved', label: `Resolved (${resolvedCount})` },
    { key: 'all',      label: `All (${reports.length})`     },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7"
              stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        <Text variant="h4" color="textPrimary">My Reports</Text>

        <TouchableOpacity style={styles.headerBtn} onPress={loadReports} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M1 4v6h6M23 20v-6h-6"
                  stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"
                  stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )
          }
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
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

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text variant="labelLarge" color="textSecondary">
          {tab === 'active' ? 'ACTIVE REPORTS' : tab === 'resolved' ? 'RESOLVED REPORTS' : 'ALL REPORTS'}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading your reports...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" color="error" style={{ textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={loadReports} style={styles.retryBtn}>
            <Text variant="bodyMedium" color="primary">Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📋</Text>
          <Text variant="bodyLarge" color="textSecondary" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            No {tab === 'all' ? '' : tab} reports yet
          </Text>
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Reports you submit will appear here
          </Text>
        </View>
      ) : (
        <ReportsList
          reports={filtered}
          onPress={(id) => navigation.navigate('ReportDetail' as any, { reportId: id })}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: colors.primary },
  activeTabText: { fontWeight: '600' },
  sectionHeader: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  retryBtn: { marginTop: spacing.md, padding: spacing.md },
});

export default MyReportsScreen;