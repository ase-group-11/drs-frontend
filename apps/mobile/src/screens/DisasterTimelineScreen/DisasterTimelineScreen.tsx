// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/DisasterTimelineScreen/DisasterTimelineScreen.tsx
//
// Citizen report status tracker.
// Uses: GET /disaster-reports/{report_id}  — citizen's own report (approved API)
// Shows: report submission → review → verification → response → resolved
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authRequest } from '@services/authService';

// Timeline steps driven by report_status from GET /disaster-reports/{id}
const STEPS = [
  { key: 'submitted', label: 'Report Submitted',          icon: '📍', done: ['pending','verified','active','resolved','rejected'] },
  { key: 'review',    label: 'Under Review',              icon: '🔍', done: ['verified','active','resolved'] },
  { key: 'verified',  label: 'Verified by Emergency Team',icon: '✅', done: ['active','resolved'] },
  { key: 'response',  label: 'Emergency Response Active', icon: '🚒', done: ['resolved'] },
  { key: 'resolved',  label: 'Incident Resolved',         icon: '🏁', done: ['resolved'] },
];

const STATUS_LABEL: Record<string, { label: string; color: string; description: string }> = {
  pending:  { label: 'Under Review',    color: '#EAB308', description: 'Your report is being reviewed by our emergency team.' },
  verified: { label: 'Verified',        color: '#3B82F6', description: 'Your report has been verified. Emergency services are being coordinated.' },
  active:   { label: 'Response Active', color: '#DC2626', description: 'Emergency services are actively responding to this incident.' },
  resolved: { label: 'Resolved',        color: '#22C55E', description: 'This incident has been resolved. Thank you for reporting.' },
  rejected: { label: 'Not Actioned',    color: '#6B7280', description: 'This report was reviewed but could not be verified or was a duplicate.' },
};

export const DisasterTimelineScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { reportId, disasterId } = route.params ?? {};

  const [report, setReport]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  // Use reportId if provided, otherwise fall back to disasterId (treated as reportId)
  const id = reportId ?? disasterId;

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setError('');
    try {
      // GET /disaster-reports/{id} — citizen's own report, approved citizen API
      const data = await authRequest<any>(`/disaster-reports/${id}`);
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Could not load report status');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  const status   = (report?.report_status ?? report?.status ?? 'pending').toLowerCase();
  const statusCfg = STATUS_LABEL[status] ?? STATUS_LABEL.pending;

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={S.header}>
        <TouchableOpacity style={S.hBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text variant="h4">Report Status</Text>
          {report?.id && (
            <Text style={S.reportId}>#{report.id.substring(0, 8).toUpperCase()}</Text>
          )}
        </View>
        <TouchableOpacity style={S.hBtn} onPress={onRefresh}>
          <Text style={{ fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading report status...
          </Text>
        </View>
      ) : error ? (
        <View style={S.center}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity style={S.retryBtn} onPress={load}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.lg }}
        >
          {/* Current status banner */}
          <View style={[S.statusBanner, { backgroundColor: statusCfg.color + '15', borderColor: statusCfg.color }]}>
            <View style={[S.statusDot, { backgroundColor: statusCfg.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[S.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              <Text style={S.statusDesc}>{statusCfg.description}</Text>
            </View>
          </View>

          {/* Incident info */}
          {report && (
            <View style={S.infoCard}>
              <Text style={S.infoRow}>
                <Text style={S.infoKey}>Type:      </Text>
                {(report.disaster_type ?? 'Unknown').replace(/_/g, ' ')}
              </Text>
              <Text style={S.infoRow}>
                <Text style={S.infoKey}>Severity:  </Text>
                {report.severity ?? '—'}
              </Text>
              <Text style={S.infoRow}>
                <Text style={S.infoKey}>Location:  </Text>
                {report.location_address ?? report.location?.address ?? '—'}
              </Text>
              {report.created_at && (
                <Text style={S.infoRow}>
                  <Text style={S.infoKey}>Reported:  </Text>
                  {new Date(report.created_at).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              )}
            </View>
          )}

          {/* Progress steps */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Progress Timeline</Text>
            {STEPS.map((step, idx) => {
              if (status === 'rejected' && step.key !== 'submitted' && step.key !== 'review') return null;
              const isDone   = step.done.includes(status);
              const isActive = !isDone && (
                (status === 'pending'  && step.key === 'review')   ||
                (status === 'verified' && step.key === 'verified') ||
                (status === 'active'   && step.key === 'response') ||
                (status === 'rejected' && step.key === 'review')
              );
              const isLast = idx === STEPS.length - 1;
              return (
                <View key={step.key} style={S.stepRow}>
                  <View style={S.stepLeft}>
                    <View style={[S.stepCircle, isDone && S.stepCircleDone, isActive && S.stepCircleActive]}>
                      {isDone
                        ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                        : <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                      }
                    </View>
                    {!isLast && <View style={[S.stepLine, isDone && S.stepLineDone]} />}
                  </View>
                  <View style={S.stepContent}>
                    <Text style={[S.stepLabel,
                      isDone   && { color: '#1F2937', fontWeight: '600' },
                      isActive && { color: colors.primary, fontWeight: '700' },
                      !isDone && !isActive && { color: '#9CA3AF' },
                    ]}>
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={S.stepActive}>In progress...</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rejection reason */}
          {status === 'rejected' && report?.rejection_reason && (
            <View style={S.rejectionCard}>
              <Text style={S.rejectionTitle}>Reason Not Actioned</Text>
              <Text style={S.rejectionText}>{report.rejection_reason}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  hBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  reportId: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  retryBtn: { marginTop: spacing.lg, padding: spacing.md },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md,
  },
  statusDot:   { width: 14, height: 14, borderRadius: 7 },
  statusLabel: { fontSize: 17, fontWeight: '800' },
  statusDesc:  { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md, gap: spacing.xs,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  infoRow:  { fontSize: 14, color: '#374151', lineHeight: 22 },
  infoKey:  { fontWeight: '700', color: '#1F2937' },

  card: {
    backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: spacing.md },

  stepRow:         { flexDirection: 'row' },
  stepLeft:        { alignItems: 'center', marginRight: spacing.md, width: 40 },
  stepCircle:      {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  stepCircleDone:  { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepCircleActive:{ backgroundColor: '#fff', borderColor: colors.primary, borderWidth: 2.5 },
  stepLine:        { width: 2, flex: 1, minHeight: 20, backgroundColor: '#E5E7EB', marginVertical: 4 },
  stepLineDone:    { backgroundColor: '#22C55E' },
  stepContent:     { flex: 1, paddingBottom: spacing.lg, paddingTop: 10 },
  stepLabel:       { fontSize: 14 },
  stepActive:      { fontSize: 12, color: colors.primary, marginTop: 3 },

  rejectionCard: {
    backgroundColor: '#FEF2F2', borderRadius: borderRadius.lg, padding: spacing.md,
    borderLeftWidth: 4, borderLeftColor: '#DC2626',
  },
  rejectionTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: spacing.xs },
  rejectionText:  { fontSize: 14, color: '#991B1B', lineHeight: 20 },
});

export default DisasterTimelineScreen;