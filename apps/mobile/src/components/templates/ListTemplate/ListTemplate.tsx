// FILE: src/components/templates/ListTemplate/ListTemplate.tsx
// FIXED: SafeAreaView from react-native-safe-area-context (not react-native)

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@theme/colors';

export interface ListTemplateProps {
  header: React.ReactNode;
  tabs?: React.ReactNode;
  sectionHeader?: React.ReactNode;
  list: React.ReactNode;
  footer?: React.ReactNode;
}

export const ListTemplate: React.FC<ListTemplateProps> = ({
  header, tabs, sectionHeader, list, footer,
}) => (
  <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
    {header}
    {tabs}
    {sectionHeader}
    <View style={styles.content}>{list}</View>
    {footer}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1 },
});

export default ListTemplate;