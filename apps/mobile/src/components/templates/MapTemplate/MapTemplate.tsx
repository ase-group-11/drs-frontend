import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { colors } from '@theme/colors';

export interface MapTemplateProps {
  header: React.ReactNode;
  filterBar?: React.ReactNode;
  map: React.ReactNode;
}

export const MapTemplate: React.FC<MapTemplateProps> = ({ header, filterBar, map }) => (
  <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
    {header}
    {filterBar}
    <View style={styles.mapContainer}>{map}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  mapContainer: { flex: 1 },
});

export default MapTemplate;
