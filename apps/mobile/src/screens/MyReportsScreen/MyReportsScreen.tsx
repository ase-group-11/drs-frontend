// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/MyReportsScreen/MyReportsScreen.tsx
// FIXED - Proper navigation with back button
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ReportsList } from '@organisms/ReportsList';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { disasterService, authService } from '@services';
import type { Report } from '../../types/disaster';

type Tab = 'active' | 'resolved' | 'all';

// Convert backend report to frontend format
const convertBackendReport = (backendReport: any): Report => {
  return {
    id: backendReport.id,
    reportNumber: `DR-${backendReport.id.substring(0, 8)}`,
    type: backendReport.disaster_type.toLowerCase(),
    severity: backendReport.severity.toLowerCase(),
    title: `${backendReport.disaster_type} - ${backendReport.severity}`,
    location: {
      latitude: backendReport.latitude,
      longitude: backendReport.longitude,
      address: backendReport.location_address || 'Unknown location',
    },
    reportedAt: new Date(backendReport.created_at),
    status: backendReport.status.toLowerCase(),
    reportedBy: 'You',
    description: backendReport.description,
    unitsResponding: backendReport.status === 'VERIFIED' ? Math.floor(Math.random() * 5) + 1 : undefined,
  };
};

export const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('active');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const user = await authService.getStoredUser();
      
      if (!user) {
        setError('Please log in to view your reports');
        setLoading(false);
        return;
      }

      const backendReports = await disasterService.getMyReports(user.id);
      const convertedReports = backendReports.map(convertBackendReport);
      setReports(convertedReports);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filtered = reports.filter((r) => {
    if (tab === 'active') return r.status !== 'resolved' && r.status !== 'rejected';
    if (tab === 'resolved') return r.status === 'resolved' || r.status === 'rejected';
    return true;
  });

  const activeCount = reports.filter((r) => r.status !== 'resolved' && r.status !== 'rejected').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved' || r.status === 'rejected').length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header with Back Button */}
      <View style={styles.header}>
        {/* ✅ Back Button - Goes to Home */}
        <TouchableOpacity 
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path 
              d="M19 12H5M12 19l-7-7 7-7" 
              stroke={colors.textPrimary} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </Svg>
        </TouchableOpacity>
        
        <Text variant="h4" color="textPrimary">My Reports</Text>
        
        {/* Refresh Button */}
        <TouchableOpacity style={styles.headerBtn} onPress={loadReports}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path 
              d="M1 4v6h6M23 20v-6h-6" 
              stroke={colors.textPrimary} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <Path 
              d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" 
              stroke={colors.textPrimary} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'active' as Tab, label: `Active (${activeCount})` },
          { key: 'resolved' as Tab, label: `Resolved (${resolvedCount})` },
          { key: 'all' as Tab, label: `All (${reports.length})` },
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

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading your reports...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text variant="bodyLarge" color="error">{error}</Text>
          <TouchableOpacity onPress={loadReports} style={{ marginTop: spacing.md }}>
            <Text variant="bodyMedium" color="primary">Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text variant="bodyLarge" color="textSecondary">
            No {tab === 'active' ? 'active' : tab === 'resolved' ? 'resolved' : ''} reports
          </Text>
        </View>
      ) : (
        <ReportsList reports={filtered} onPress={(id) => console.log('View report:', id)} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  activeTabText: { fontWeight: '600' },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default MyReportsScreen;