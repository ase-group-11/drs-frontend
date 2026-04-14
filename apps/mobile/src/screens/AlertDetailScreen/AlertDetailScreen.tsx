// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/AlertDetailScreen/AlertDetailScreen.tsx
// Full detail view for an active alert, opened from AlertsScreen
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Linking,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import type { Alert } from '../../types/disaster';
import { formatDateTime as fmtDT, formatTimeAgo } from '@utils/formatters';

// ─── Route param type ─────────────────────────────────────────────────────
type AlertDetailRouteParams = {
  AlertDetail: { alert: Alert };
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  critical: { color: colors.error,   bg: colors.errorBg,   label: 'Critical',  icon: '🔴' },
  high:     { color: colors.coral,   bg: '#FFF5F5',        label: 'High',      icon: '🟠' },
  medium:   { color: colors.warning, bg: colors.warningBg, label: 'Medium',    icon: '🟡' },
  low:      { color: colors.primary, bg: '#EFF8FF',        label: 'Low',       icon: '🔵' },
};

const TYPE_EMOJI: Record<string, string> = {
  evacuation: '🚨',
  warning:    '⚠️',
  advisory:   'ℹ️',
};

// Use shared timezone-safe formatters
const getTimeAgo = (date: Date) => formatTimeAgo(date.toISOString());
const formatDateTime = (date: Date) => fmtDT(date.toISOString());

// ─── Component ────────────────────────────────────────────────────────────
export const AlertDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AlertDetailRouteParams, 'AlertDetail'>>();
  const { alert } = route.params;

  const [directionsLoading, setDirectionsLoading] = useState(false);

  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
  const typeIcon = TYPE_EMOJI[alert.type] ?? '⚠️';
  const isCritical = alert.severity === 'critical' || alert.severity === 'high';

  // Open native maps with the alert's coordinates
  const handleGetDirections = useCallback(async () => {
    setDirectionsLoading(true);
    const { latitude, longitude, name } = alert.location;
    const label = encodeURIComponent(name);
    const url =
      `maps://app?daddr=${latitude},${longitude}&q=${label}` +   // Apple Maps
      `|geo:${latitude},${longitude}?q=${label}`;               // Android fallback

    const appleUrl = `maps://app?daddr=${latitude},${longitude}`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    try {
      const canApple = await Linking.canOpenURL(appleUrl);
      if (canApple) {
        await Linking.openURL(appleUrl);
      } else {
        await Linking.openURL(googleUrl);
      }
    } catch {
      RNAlert.alert('Maps unavailable', 'Could not open directions. Please check your maps app.');
    } finally {
      setDirectionsLoading(false);
    }
  }, [alert.location]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
        <Text variant="h4" color="textPrimary">Alert Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Severity banner */}
        {isCritical && (
          <View style={[styles.banner, { backgroundColor: sev.color }]}>
            <Text variant="bodyMedium" style={styles.bannerText}>
              🚨 Immediate action may be required
            </Text>
          </View>
        )}

        {/* Hero card */}
        <View style={[styles.heroCard, isCritical && { borderLeftColor: sev.color, borderLeftWidth: 4 }]}>
          <View style={styles.heroTop}>
            <View style={[styles.typeCircle, { backgroundColor: sev.color }]}>
              <Text style={styles.typeEmoji}>{typeIcon}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text variant="h4" color="textPrimary">{alert.title}</Text>
              <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: 2 }}>
                {alert.disasterType.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          {/* Severity badge */}
          <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
            <Text variant="bodySmall" style={{ color: sev.color, fontWeight: '700' }}>
              {sev.icon}  {sev.label.toUpperCase()} SEVERITY
            </Text>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <Text variant="h5" color="textPrimary" style={styles.cardTitle}>📍 Location</Text>
          <Text variant="bodyMedium" color="textPrimary">{alert.location.name}</Text>
          <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.xs }}>
            {alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}
          </Text>

          {/* Mini map placeholder */}
          <View style={styles.miniMap}>
            <View style={[styles.miniMarker, { backgroundColor: sev.color }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                  fill={colors.white}
                  stroke={colors.white}
                  strokeWidth="1"
                />
                <Circle cx="12" cy="10" r="3" fill={sev.color} />
              </Svg>
            </View>
            <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.sm }}>
              {alert.location.name}
            </Text>
          </View>

          <Button
            title="↗  Get Directions"
            variant="outline"
            size="medium"
            loading={directionsLoading}
            onPress={handleGetDirections}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Message card */}
        <View style={styles.card}>
          <Text variant="h5" color="textPrimary" style={styles.cardTitle}>📋 Details</Text>
          <Text variant="bodyMedium" color="textPrimary" style={styles.messageText}>
            {alert.message}
          </Text>
        </View>

        {/* Timing card */}
        <View style={styles.card}>
          <Text variant="h5" color="textPrimary" style={styles.cardTitle}>🕐 Timeline</Text>

          <View style={styles.timeRow}>
            <View style={[styles.timeDot, { backgroundColor: sev.color }]} />
            <View>
              <Text variant="bodyMedium" color="textPrimary">Alert Issued</Text>
              <Text variant="bodySmall" color="textSecondary">
                {formatDateTime(alert.issuedAt)} · {getTimeAgo(alert.issuedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.timeRow}>
            <View style={[styles.timeDot, { backgroundColor: colors.gray300 }]} />
            <View>
              <Text variant="bodyMedium" color="textSecondary">Status</Text>
              <Text variant="bodySmall" color="textSecondary">
                {alert.isRead ? 'Acknowledged' : 'Unread'}
              </Text>
            </View>
          </View>
        </View>

        {/* Safety guidance */}
        {isCritical && (
          <View style={[styles.card, { borderColor: sev.color, borderWidth: 1 }]}>
            <Text variant="h5" style={{ color: sev.color }} style={styles.cardTitle}>
              ⚡ Safety Guidance
            </Text>
            <Text variant="bodyMedium" color="textPrimary" style={{ lineHeight: 22 }}>
              • Follow instructions from emergency services{'\n'}
              • Avoid the affected area{'\n'}
              • Keep your phone charged and stay informed{'\n'}
              • Contact emergency services if in immediate danger: <Text variant="bodyMedium" style={{ color: sev.color }}>112 / 999</Text>
            </Text>
          </View>
        )}

        {/* Bottom actions */}
        <View style={styles.actions}>
          <Button
            title="↗  Get Directions"
            variant="primary"
            size="large"
            loading={directionsLoading}
            onPress={handleGetDirections}
            style={{ backgroundColor: sev.color }}
          />
          <Button
            title="← Back to Alerts"
            variant="outline"
            size="large"
            onPress={() => navigation.goBack()}
          />
        </View>

      </ScrollView>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.massive },
  banner: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  bannerText: { color: colors.white, fontWeight: '700' },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  heroTop: { flexDirection: 'row', marginBottom: spacing.md },
  typeCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  typeEmoji: { fontSize: 24, lineHeight: 32 },
  heroInfo: { flex: 1, justifyContent: 'center' },
  sevBadge: {
    borderRadius: borderRadius.sm, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md, alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTitle: { marginBottom: spacing.md, fontWeight: '700' },
  miniMap: {
    height: 140,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMarker: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.md,
  },
  messageText: { lineHeight: 22 },
  timeRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: spacing.md, gap: spacing.md,
  },
  timeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});

export default AlertDetailScreen;