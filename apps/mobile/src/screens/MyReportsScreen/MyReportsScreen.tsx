// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/MyReportsScreen/MyReportsScreen.tsx
// FIXED - Proper navigation with back button
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ReportsList } from '@organisms/ReportsList';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { disasterService, authService } from '@services';
import { authRequest } from '@services/authService';
import { API } from '@services/apiConfig';
import type { Report } from '../../types/disaster';

type Tab = 'active' | 'resolved' | 'all';

// Disaster statuses that mean the incident is fully resolved
const RESOLVED_DISASTER_STATUSES = ['RESOLVED', 'CLOSED', 'FALSE_ALARM', 'CANCELLED'];

// Convert backend report to frontend format
const convertBackendReport = (backendReport: any): Report => {
  const disasterType = String(backendReport.disaster_type ?? 'OTHER');
  const severity     = String(backendReport.severity      ?? 'MEDIUM');
  const reportStatus = String(backendReport.report_status ?? backendReport.status ?? 'pending');

  const lat = backendReport.latitude  ?? backendReport.location?.lat  ?? 53.3498;
  const lon = backendReport.longitude ?? backendReport.location?.lon  ?? -6.2603;

  return {
    id:           String(backendReport.id ?? ''),
    reportNumber: `DR-${String(backendReport.id ?? '00000000').substring(0, 8).toUpperCase()}`,
    type:         disasterType.toLowerCase(),
    severity:     severity.toLowerCase(),
    title:        `${disasterType.replace(/_/g, ' ')} — ${severity}`,
    location: {
      latitude:  Number(lat),
      longitude: Number(lon),
      address:   String(backendReport.location_address ?? backendReport.location?.address ?? 'Unknown location'),
    },
    reportedAt:  backendReport.created_at ? new Date(backendReport.created_at) : new Date(),
    // Store disaster_id so we can enrich status later
    status:      reportStatus.toLowerCase() as any,
    reportedBy:  'You',
    description: String(backendReport.description ?? ''),
    // Store raw for enrichment
    _disasterId: backendReport.disaster_id ?? null,
  } as any;
};

// Fetch linked disaster statuses and upgrade report status to 'resolved' if disaster is resolved
const enrichWithDisasterStatus = async (reports: any[]): Promise<Report[]> => {
  const enriched = await Promise.all(
    reports.map(async (r: any) => {
      // Already resolved/rejected — no need to fetch
      if (r.status === 'resolved' || r.status === 'rejected') return r;
      // No linked disaster — can't enrich
      if (!r._disasterId) return r;
      try {
        const disaster = await authRequest<any>(API.disasters.byId(r._disasterId));
        const ds = (disaster?.disaster_status ?? '').toUpperCase();
        if (RESOLVED_DISASTER_STATUSES.includes(ds)) {
          return { ...r, status: 'resolved' };
        }
        // Map ACTIVE/ON_SCENE disaster → report status 'active'
        if (['ACTIVE', 'DISPATCHED', 'ON_SCENE', 'IN_PROGRESS'].includes(ds)) {
          return { ...r, status: 'active' };
        }
      } catch {
        // Non-critical — keep original status
      }
      return r;
    })
  );
  return enriched;
};

export const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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

      // Guard: user.id must be a valid UUID string
      const userId = user?.id;
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('[MyReports] Invalid user ID:', userId, 'user object:', JSON.stringify(user));
        setError('Could not identify user. Please log out and log in again.');
        setLoading(false);
        return;
      }

      console.log('[MyReports] Loading reports for user:', userId);
      const backendReports = await disasterService.getMyReports(userId);
      const convertedReports = backendReports.map(convertBackendReport);
      // Enrich statuses from linked disaster — backend often keeps report_status as
      // 'verified' even after the disaster is RESOLVED
      const enrichedReports = await enrichWithDisasterStatus(convertedReports);
      setReports(enrichedReports);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      const msg = err.message || '';
      if (msg.includes('Not Found') || msg.includes('404')) {
        setError('Your reports could not be loaded. The backend may need a configuration update.');
        console.error('[MyReports] 404 — backend is missing GET /disaster-reports/user/{user_id} endpoint.');
      } else {
        setError(msg || 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = reports.filter((r) => {
    const s = (r.status ?? '').toLowerCase();
    if (tab === 'active')   return s !== 'resolved' && s !== 'rejected';
    if (tab === 'resolved') return s === 'resolved' || s === 'rejected';
    return true; // 'all'
  });

  const activeCount   = reports.filter((r) => {
    const s = (r.status ?? '').toLowerCase();
    return s !== 'resolved' && s !== 'rejected';
  }).length;
  const resolvedCount = reports.filter((r) => {
    const s = (r.status ?? '').toLowerCase();
    return s === 'resolved' || s === 'rejected';
  }).length;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
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
            {tab === 'active'
              ? 'No active reports'
              : tab === 'resolved'
              ? 'No resolved reports yet'
              : 'No reports yet'}
          </Text>
          {tab === 'active' && (
            <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: 8, textAlign: 'center' }}>
              Reports you submit will appear here while being processed
            </Text>
          )}
        </View>
      ) : (
        <ReportsList
          reports={filtered}
          onPress={(id) => (navigation as any).navigate('ReportDetail', { reportId: id })}
        />
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