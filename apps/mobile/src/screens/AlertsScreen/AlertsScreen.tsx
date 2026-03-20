// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/AlertsScreen/AlertsScreen.tsx
// FIXED - Proper navigation with back button
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertsList } from '@organisms/AlertsList';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import type { Alert } from '../../types/disaster';

type Tab = 'all' | 'critical' | 'my_area';

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // TODO: When backend adds /api/v1/alerts endpoint, use it here
      // const alertsData = await alertsService.getAlerts();
      // setAlerts(alertsData);
      
      // For now, show empty state
      setAlerts([]);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = alerts.filter((a) => {
    if (tab === 'critical') return a.severity === 'critical';
    if (tab === 'my_area') {
      const distance = parseFloat(a.distance);
      return !isNaN(distance) && distance <= 1;
    }
    return true;
  });

  const critCount = alerts.filter((a) => a.severity === 'critical').length;
  const myAreaCount = alerts.filter((a) => {
    const distance = parseFloat(a.distance);
    return !isNaN(distance) && distance <= 1;
  }).length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: alerts.length },
    { key: 'critical', label: 'Critical', count: critCount },
    { key: 'my_area', label: 'My Area', count: myAreaCount },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header with Back Button */}
      <View style={styles.header}>
        {/* ✅ Back Button - Goes back */}
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
        
        <Text variant="h4" color="textPrimary">Active Alerts</Text>
        
        {/* Refresh Button */}
        <TouchableOpacity style={styles.headerBtn} onPress={loadAlerts}>
          <Text variant="bodyMedium" color="primary">Refresh</Text>
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
              color={tab === t.key ? 'primary' : 'textSecondary'}
              style={tab === t.key ? styles.activeTabText : undefined}
            >
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.md }}>
            Loading alerts...
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path 
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
              stroke={colors.textSecondary} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </Svg>
          <Text variant="h4" color="textSecondary" style={{ marginTop: spacing.lg }}>
            No Active Alerts
          </Text>
          <Text variant="bodyMedium" color="textSecondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            You'll be notified when there are emergencies in your area
          </Text>
        </View>
      ) : (
        <AlertsList alerts={filtered} onPress={(id) => console.log('View alert:', id)} />
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
    width: 60,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default AlertsScreen;