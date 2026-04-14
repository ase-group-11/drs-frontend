import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { FilterTab } from '../../molecules/FilterTab';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import type { DisasterFilter } from '../../../types/disaster';

export interface FilterTabsProps {
  filters: DisasterFilter[];
  selected: string;
  onSelect: (id: string) => void;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ filters, selected, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.scroll}
    contentContainerStyle={styles.content}
  >
    {filters.map((f) => (
      <FilterTab
        key={f.id}
        label={f.label}
        isActive={selected === f.id}
        onPress={() => onSelect(f.id)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 50,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xl,  // extra right padding so last chip isn't clipped
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});

export default FilterTabs;