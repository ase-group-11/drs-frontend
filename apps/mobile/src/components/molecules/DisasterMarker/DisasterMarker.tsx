import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { colors } from '@theme/colors';
import type { DisasterType, DisasterSeverity } from '../../../types/disaster';

export interface DisasterMarkerProps {
  type: DisasterType;
  severity: DisasterSeverity;
}

const SEVERITY_COLORS: Record<DisasterSeverity, string> = {
  critical: colors.error,
  high: colors.coral,
  medium: colors.warning,
  low: colors.primary,
};

const DISASTER_ICONS: Record<DisasterType, string> = {
  fire: '🔥',
  flood: '🌊',
  storm: '💨',
  power: '⚡',
  accident: '🚗',
};

export const DisasterMarker: React.FC<DisasterMarkerProps> = ({ type, severity }) => (
  <View style={[styles.marker, { backgroundColor: SEVERITY_COLORS[severity] }]}>
    <RNText style={styles.icon}>{DISASTER_ICONS[type]}</RNText>
  </View>
);

const styles = StyleSheet.create({
  marker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: { fontSize: 24 },
});

export default DisasterMarker;