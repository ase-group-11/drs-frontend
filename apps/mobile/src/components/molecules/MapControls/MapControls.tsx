import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { spacing, shadows } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';

export interface MapControlsProps {
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const CtrlBtn: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({
  onPress,
  children,
}) => (
  <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
    {children}
  </TouchableOpacity>
);

export const MapControls: React.FC<MapControlsProps> = ({
  onLocate,
  onZoomIn,
  onZoomOut,
}) => (
  <View style={styles.container}>
    <CtrlBtn onPress={onLocate}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={colors.textPrimary} strokeWidth="2" />
        <Circle cx="12" cy="12" r="3" fill={colors.primary} />
      </Svg>
    </CtrlBtn>
    <CtrlBtn onPress={onZoomIn}>
      <Text variant="h5" color="textPrimary">+</Text>
    </CtrlBtn>
    <CtrlBtn onPress={onZoomOut}>
      <Text variant="h5" color="textPrimary">−</Text>
    </CtrlBtn>
  </View>
);

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
});

export default MapControls;