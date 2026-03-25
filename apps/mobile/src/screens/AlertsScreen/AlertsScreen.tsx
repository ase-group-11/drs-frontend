import React, { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
} from 'react-native';
import { AlertsList } from '@organisms/AlertsList';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import type { Alert } from '../../types/disaster';

const MOCK_ALERTS: Alert[] = [
  {
    id: '1', type: 'evacuation', severity: 'critical',
    title: 'Evacuation Order', disasterType: 'Fire Emergency',
    location: { latitude: 53.3439, longitude: -6.2674, name: "O'Connell St area" },
    distance: '500m from you',
    message: 'Residents within 300m must evacuate immediately. Emergency services on scene.',
    issuedAt: new Date(Date.now() - 15 * 60000), isRead: false,
  },
  {
    id: '2', type: 'warning', severity: 'critical',
    title: 'Flood Warning', disasterType: 'Natural Disaster',
    location: { latitude: 53.3406, longitude: -6.2603, name: 'Temple Bar' },
    distance: '2.5km from you',
    message: 'Water levels rising rapidly. Avoid low-lying areas.',
    issuedAt: new Date(Date.now() - 30 * 60000), isRead: false,
  },
  {
    id: '3', type: 'advisory', severity: 'medium',
    title: 'Storm Advisory', disasterType: 'Weather Alert',
    location: { latitude: 53.3498, longitude: -6.2603, name: 'North Wall Quay' },
    distance: '1km from you',
    message: 'Strong winds expected. Secure loose objects outdoors.',
    issuedAt: new Date(Date.now() - 60 * 60000), isRead: true,
  },
];

type Tab = 'all' | 'critical' | 'my_area';

export const AlertsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('all');

  const filtered = MOCK_ALERTS.filter((a) => {
    if (tab === 'critical') return a.severity === 'critical';
    if (tab === 'my_area') return parseFloat(a.distance) <= 1;
    return true;
  });

  const critCount = MOCK_ALERTS.filter((a) => a.severity === 'critical').length;
  const myAreaCount = MOCK_ALERTS.filter((a) => parseFloat(a.distance) <= 1).length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: MOCK_ALERTS.length },
    { key: 'critical', label: 'Critical', count: critCount },
    { key: 'my_area', label: 'My Area', count: myAreaCount },
  ];

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
        <Text variant="h4" color="textPrimary">Active Alerts</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Text variant="bodyMedium" color="primary">Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              variant="bodyMedium"
              color={tab === t.key ? 'white' : 'textPrimary'}
            >
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Critical banner */}
      {tab !== 'my_area' && critCount > 0 && (
        <View style={styles.critBanner}>
          <Text variant="labelMedium" color="white">🔴  CRITICAL ALERTS ACTIVE</Text>
        </View>
      )}

      <AlertsList
        alerts={filtered}
        onViewDetails={(id) => console.log('View', id)}
        onGetDirections={(id) => console.log('Directions', id)}
      />

      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary" align="center">
          Receiving alerts for Dublin area
        </Text>
        <TouchableOpacity>
          <Text variant="bodySmall" color="primary" style={styles.changeSettings}>
            Change Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: spacing.sm },
  tabBar: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, backgroundColor: colors.white },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.md, backgroundColor: colors.gray100 },
  tabActive: { backgroundColor: colors.primary },
  critBanner: { backgroundColor: colors.error, padding: spacing.md, alignItems: 'center' },
  footer: { padding: spacing.md, backgroundColor: colors.gray50, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  changeSettings: { marginTop: spacing.xs, fontWeight: '600' },
});

export default AlertsScreen;
