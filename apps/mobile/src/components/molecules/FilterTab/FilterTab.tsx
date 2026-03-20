// src/components/molecules/FilterTab/FilterTab.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';

export interface FilterTabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export const FilterTab: React.FC<FilterTabProps> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.active]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text variant="bodyMedium" color={isActive ? 'white' : 'textPrimary'}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  active: { backgroundColor: colors.primary },
});

export default FilterTab;