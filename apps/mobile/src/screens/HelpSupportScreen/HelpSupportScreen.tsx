// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/HelpSupportScreen/HelpSupportScreen.tsx
// FIXED: Working 999 call, expandable FAQ accordions, email support,
//        removed fake "Live Chat Online" and placeholder Video Tutorials
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, Alert, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── FAQ content ──────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'How do I report a disaster?',
    a: 'Tap the red "Report Disaster" button on the home map screen. Follow the 4-step wizard: select the location, choose the disaster type and severity, add a description and optional photos, then review and submit. Your report goes directly to the emergency services team.',
  },
  {
    q: 'What happens after I submit a report?',
    a: 'Your report enters a "Pending" status and is reviewed by the emergency team within minutes. If verified, it becomes an active disaster on the live map and emergency units are dispatched. You can track the status in "My Reports".',
  },
  {
    q: 'What is the false alarm policy?',
    a: 'Submitting false or misleading reports is a serious offence and may result in account suspension. Emergency resources are limited — please only report real incidents you have witnessed or have reliable information about.',
  },
  {
    q: 'How do disaster filters on the map work?',
    a: 'The filter chips at the top of the map (Fire, Flood, Storm etc.) filter which disaster markers are visible. Tap a category to show only that type. Tap "All" to show everything.',
  },
  {
    q: 'What do the route colours mean?',
    a: 'When you search a destination:\n• Blue solid line — recommended route\n• Red dashed line — original route (blocked by disaster)\n• Green solid line — alternative detour\nThe animated car shows real-time movement along the active route.',
  },
  {
    q: 'Why is my location not working?',
    a: 'Go to iPhone Settings → Privacy & Security → Location Services → DRS → set to "While Using". The app requires location access to show nearby disasters and to use the "Use Current Location" feature in reports.',
  },
  {
    q: 'How do I track a submitted report?',
    a: 'After submitting, tap "Track This Report" on the success screen, or navigate to the menu → "My Reports" and tap any report card to see full details, status timeline, and linked disaster information.',
  },
  {
    q: 'What does each report status mean?',
    a: '• Pending — awaiting review by the emergency team\n• Verified — confirmed, services dispatched\n• Active Response — units on the scene\n• Resolved — incident closed\n• Rejected — not actioned (reason shown)',
  },
];

// ─── Component ────────────────────────────────────────────────────────────
export const HelpSupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState<number | null>(null);

  const call999 = () => {
    Alert.alert(
      'Call Emergency Services',
      'This will call 999. Only use for genuine emergencies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 999', style: 'destructive', onPress: () => Linking.openURL('tel:999') },
      ]
    );
  };

  const emailSupport = () => {
    Linking.openURL('mailto:support@drs.ie?subject=DRS App Support').catch(() =>
      Alert.alert('Error', 'Could not open mail app. Email us at support@drs.ie')
    );
  };

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.headerBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7"
              stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4">Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Contact cards ── */}
        <View style={S.cardRow}>

          {/* 999 — works */}
          <TouchableOpacity style={[S.contactCard, S.cardRed]} onPress={call999} activeOpacity={0.8}>
            <Text style={S.cardIcon}>🚨</Text>
            <Text variant="h5">Emergency</Text>
            <Text style={S.cardNumber}>999</Text>
            <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
              Tap to call
            </Text>
          </TouchableOpacity>

          {/* Email support — works */}
          <TouchableOpacity style={[S.contactCard, S.cardBlue]} onPress={emailSupport} activeOpacity={0.8}>
            <Text style={S.cardIcon}>✉️</Text>
            <Text variant="h5">Support</Text>
            <Text style={S.cardEmail}>support@drs.ie</Text>
            <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
              Tap to email
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Emergency note ── */}
        <View style={S.emergNote}>
          <Text style={{ fontSize: 16, marginRight: spacing.sm }}>⚠️</Text>
          <Text variant="bodySmall" color="textSecondary" style={{ flex: 1, lineHeight: 18 }}>
            For immediate life-threatening emergencies always call <Text style={{ fontWeight: '700' }}>999</Text> directly. Do not rely solely on the DRS app.
          </Text>
        </View>

        {/* ── FAQ ── */}
        <Text variant="labelLarge" color="textSecondary" style={S.sectionTitle}>
          FREQUENTLY ASKED
        </Text>

        {FAQS.map((item, idx) => (
          <View key={idx}>
            <TouchableOpacity
              style={[S.faqHeader, expanded === idx && S.faqHeaderOpen]}
              onPress={() => setExpanded(expanded === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <Text variant="bodyLarge" color="textPrimary" style={{ flex: 1, paddingRight: spacing.sm }}>
                {item.q}
              </Text>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d={expanded === idx ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                  stroke={colors.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            {expanded === idx && (
              <View style={S.faqBody}>
                <Text variant="bodyMedium" color="textSecondary" style={{ lineHeight: 22 }}>
                  {item.a}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={S.footer}>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
            DRS Support Team • Available 24/7
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xs }}>
            support@drs.ie
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  cardRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  contactCard: {
    flex: 1, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center',
  },
  cardRed:  { backgroundColor: '#FFF5F5' },
  cardBlue: { backgroundColor: '#EFF6FF' },
  cardIcon: { fontSize: 36, marginBottom: spacing.sm },
  cardNumber: { fontSize: 22, fontWeight: '800', color: colors.error, marginTop: spacing.xs },
  cardEmail:  { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: spacing.xs, textAlign: 'center' },

  emergNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.md, backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md, borderLeftWidth: 3, borderLeftColor: colors.warning,
  },

  sectionTitle: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    paddingBottom: spacing.sm, letterSpacing: 0.5,
  },

  faqHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
    backgroundColor: colors.white,
  },
  faqHeaderOpen: { backgroundColor: '#F8FAFC' },
  faqBody: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },

  footer: {
    paddingVertical: spacing.xxxl,
    borderTopWidth: 1, borderTopColor: colors.gray100,
    marginTop: spacing.lg,
  },
});

export default HelpSupportScreen;