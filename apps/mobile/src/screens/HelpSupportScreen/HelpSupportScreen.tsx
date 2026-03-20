import React from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text as RNText,
} from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';

const FAQ_ITEMS = [
  'How do I report a disaster?',
  'What happens after I submit a report?',
  'How does the evacuation procedure work?',
  'What is the false alarm policy?',
  'How do I set up saved locations?',
];

const VIDEOS = [
  { title: 'How to Report a Disaster', duration: '2:30', views: '1.2k views' },
  { title: 'Navigating the Map Screen', duration: '1:45', views: '890 views' },
  { title: 'Setting Up Alerts', duration: '3:10', views: '654 views' },
];

export const HelpSupportScreen: React.FC = () => (
  <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
      <Text variant="h4" color="textPrimary">Help & Support</Text>
      <TouchableOpacity style={styles.headerBtn}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="8" stroke={colors.textPrimary} strokeWidth="2" />
          <Path d="M21 21l-4.35-4.35" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
    </View>

    {/* Search */}
    <View style={styles.searchBox}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx="11" cy="11" r="8" stroke={colors.textSecondary} strokeWidth="2" />
        <Path d="M21 21l-4.35-4.35" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
      </Svg>
      <Text variant="bodyMedium" color="textPlaceholder" style={styles.searchPlaceholder}>
        Search help topics...
      </Text>
    </View>

    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Emergency Cards */}
      <View style={styles.cardRow}>
        <TouchableOpacity style={[styles.emergCard, styles.emergRed]}>
          <RNText style={styles.emergIcon}>🚨</RNText>
          <Text variant="h5" color="textPrimary">Emergency</Text>
          <Text variant="bodyLarge" color="error" style={styles.emergNum}>999</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.emergCard, styles.emergBlue]}>
          <RNText style={styles.emergIcon}>💬</RNText>
          <Text variant="h5" color="textPrimary">Live Chat</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text variant="bodySmall" color="success">Online</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* FAQ */}
      <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
        FREQUENTLY ASKED
      </Text>
      {FAQ_ITEMS.map((q, i) => (
        <TouchableOpacity key={i} style={styles.faqItem} activeOpacity={0.7}>
          <Text variant="bodyLarge" color="textPrimary" style={{ flex: 1 }}>{q}</Text>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9l6 6 6-6" stroke={colors.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      ))}

      {/* Videos */}
      <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
        VIDEO TUTORIALS
      </Text>
      {VIDEOS.map((v, i) => (
        <TouchableOpacity key={i} style={styles.videoItem} activeOpacity={0.7}>
          <View style={styles.videoThumb}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill={colors.primary} />
              <Path d="M10 8l6 4-6 4V8z" fill={colors.white} />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyLarge" color="textPrimary">{v.title}</Text>
            <Text variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.xs }}>
              {v.duration} • {v.views}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary" align="center">
          DRS Support Team • Available 24/7
        </Text>
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, padding: spacing.md, backgroundColor: colors.gray50, borderRadius: borderRadius.md },
  searchPlaceholder: { marginLeft: spacing.sm },
  cardRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  emergCard: { flex: 1, padding: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center' },
  emergRed: { backgroundColor: '#FFF5F5' },
  emergBlue: { backgroundColor: '#F0F8FF' },
  emergIcon: { fontSize: 40, marginBottom: spacing.sm },
  emergNum: { fontWeight: '700', marginTop: spacing.xs },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  sectionTitle: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  faqItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  videoItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  videoThumb: { width: 100, height: 60, backgroundColor: colors.gray100, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  footer: { paddingVertical: spacing.massive },
});

export default HelpSupportScreen;