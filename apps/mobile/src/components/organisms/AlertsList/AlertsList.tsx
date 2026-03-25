import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { AlertCard } from '@molecules/AlertCard';
import { Text } from '@/components/atoms/Text';
import { spacing } from '@theme/spacing';
import type { Alert } from '../../../types/disaster';

export interface AlertsListProps {
  alerts: Alert[];
  onViewDetails: (id: string) => void;
  onGetDirections: (id: string) => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  onViewDetails,
  onGetDirections,
}) => (
  <FlatList
    data={alerts}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <AlertCard
        alert={item}
        onViewDetails={() => onViewDetails(item.id)}
        onGetDirections={() => onGetDirections(item.id)}
      />
    )}
    contentContainerStyle={styles.list}
    showsVerticalScrollIndicator={false}
    ListEmptyComponent={
      <View style={styles.empty}>
        <Text variant="bodyLarge" color="textSecondary" align="center">
          No alerts in your area
        </Text>
      </View>
    }
  />
);

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.massive },
  empty: { padding: spacing.massive },
});

export default AlertsList;
