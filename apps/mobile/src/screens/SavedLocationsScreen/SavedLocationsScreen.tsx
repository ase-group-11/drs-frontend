import React from 'react';
import {
  View, FlatList, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
} from 'react-native';
import { LocationCard } from '@molecules/LocationCard';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';
import type { SavedLocation } from '../../types/disaster';

const MOCK_LOCATIONS: SavedLocation[] = [
  { id: '1', name: 'Home', emoji: '🏠', address: '45 Merrion Square', city: 'Dublin 2', latitude: 53.3398, longitude: -6.2473, alertCount: 0 },
  { id: '2', name: 'Work', emoji: '💼', address: 'Barrow Street, D4', city: 'Dublin 4', latitude: 53.3472, longitude: -6.2386, alertCount: 1 },
  { id: '3', name: "Mom's House", emoji: '👪', address: '12 Howth Road', city: 'Dublin 3', latitude: 53.3808, longitude: -6.2396, alertCount: 0 },
];

export const SavedLocationsScreen: React.FC = () => (
  <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
      <Text variant="h4" color="textPrimary">Saved Locations</Text>
      <TouchableOpacity style={styles.headerBtn}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={colors.primary} strokeWidth="2" />
          <Path d="M12 8v8M8 12h8" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
    </View>

    <FlatList
      data={MOCK_LOCATIONS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <LocationCard
          location={item}
          onViewMap={() => console.log('Map:', item.id)}
          onEdit={() => console.log('Edit:', item.id)}
        />
      )}
      contentContainerStyle={styles.list}
    />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: spacing.sm },
  list: { padding: spacing.md },
});

export default SavedLocationsScreen;