import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
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
  <SafeAreaView style={styles.safe}>
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