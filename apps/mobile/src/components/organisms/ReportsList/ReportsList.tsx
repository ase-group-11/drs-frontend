// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/ReportsList/ReportsList.tsx
// FIXED: @/components/atoms/Text → @atoms/Text
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { ReportCard } from '@molecules/ReportCard';
import { Text } from '@/components/atoms/Text';
import { spacing } from '@theme/spacing';
import type { Report } from '../../../types/disaster';

export interface ReportsListProps {
  reports: Report[];
  onPress: (id: string) => void;
}

export const ReportsList: React.FC<ReportsListProps> = ({ reports, onPress }) => (
  <FlatList
    data={reports}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <ReportCard report={item} onPress={() => onPress(item.id)} />
    )}
    contentContainerStyle={styles.list}
    showsVerticalScrollIndicator={false}
    ListEmptyComponent={
      <View style={styles.empty}>
        <Text variant="bodyLarge" color="textSecondary" align="center">
          No reports yet
        </Text>
      </View>
    }
  />
);

const styles = StyleSheet.create({
  list:  { paddingBottom: spacing.massive },
  empty: { padding: spacing.massive },
});

export default ReportsList;