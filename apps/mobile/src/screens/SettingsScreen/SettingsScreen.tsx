// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/SettingsScreen/SettingsScreen.tsx
// FIXED: Real user data from API, persisted toggles, working logout,
//        inline modals for About/Terms/Privacy, removed no-API items
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, Switch, Modal, ActivityIndicator, Alert, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing, borderRadius, shadows } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';
import { authService, authRequest } from '@services/authService';

// ─── Pref storage keys ────────────────────────────────────────────────────
const P_PUSH  = '@prefs/push_notifications';
const P_SMS   = '@prefs/sms_alerts';
const P_EMAIL = '@prefs/email_updates';
const P_LOC   = '@prefs/location_services';

// ─── Static text content ──────────────────────────────────────────────────
const ABOUT = `Dublin Disaster Response System (DRS) is a real-time disaster reporting and response coordination platform for Dublin, Ireland.

Version: 1.0.0

DRS connects citizens, emergency services and city infrastructure to provide faster, smarter disaster response. Reports you submit go directly to the emergency services team for review and dispatch.`;

const TERMS = `Terms & Conditions

1. Use DRS only to report genuine disasters or emergencies.
2. False or malicious reports may result in account suspension.
3. Your location is used solely to show nearby disasters and alerts.
4. Reports you submit are shared with relevant emergency services.
5. DRS is NOT a replacement for emergency services. Always call 999 in a life-threatening situation.
6. Submitted content may be used by emergency responders and city authorities.`;

const PRIVACY = `Privacy Policy

What we collect:
• Your name and phone number (account creation)
• Location data when the app is open (nearby alerts only)
• Disaster reports and photos you submit

How we use it:
• To send you relevant disaster alerts
• To route your reports to emergency services
• We do NOT sell your data to third parties

Retention:
• Account data kept while your account is active
• Submitted reports retained as city emergency records

To delete your account contact support@drs.ie`;

// ─── Component ────────────────────────────────────────────────────────────
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [profile, setProfile]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);

  const [pushNotif, setPushNotif]           = useState(true);
  const [smsAlerts, setSmsAlerts]           = useState(true);
  const [emailUpdates, setEmailUpdates]     = useState(false);
  const [locationServices, setLocationServices] = useState(true);

  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load persisted toggle prefs
      const [push, sms, email, loc] = await Promise.all([
        AsyncStorage.getItem(P_PUSH),
        AsyncStorage.getItem(P_SMS),
        AsyncStorage.getItem(P_EMAIL),
        AsyncStorage.getItem(P_LOC),
      ]);
      if (push  !== null) setPushNotif(push   === 'true');
      if (sms   !== null) setSmsAlerts(sms    === 'true');
      if (email !== null) setEmailUpdates(email === 'true');
      if (loc   !== null) setLocationServices(loc === 'true');

      // Load user profile
      const stored = await authService.getStoredUser();
      if (stored?.id) {
        // GET /users/{id} requires admin auth — use stored data + fetch report stats separately
        setProfile(stored);
        try {
          const reportData = await authRequest<any>(`/disaster-reports/user/${stored.id}?limit=100`);
          const reports: any[] = reportData?.reports ?? [];
          const verified = reports.filter((r: any) => r.report_status === 'VERIFIED' || r.report_status === 'verified').length;
          setProfile({
            ...stored,
            stats: {
              total_reports:    reports.length,
              verified_reports: verified,
            },
          });
        } catch {
          // stats unavailable — show stored data without stats
        }
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
    setLoading(false);
  };

  const toggle = (key: string, val: boolean) => AsyncStorage.setItem(key, String(val));

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
        },
      },
    ]);
  };

  const initials = profile?.full_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.headerBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4">Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile card ── */}
        <TouchableOpacity
          style={S.profileCard}
          activeOpacity={0.8}
          onPress={() => profile && setModal({
            title: 'Profile Information',
            body: `Name:  ${profile.full_name ?? '—'}\nPhone: ${profile.phone_number ?? '—'}\nEmail: ${profile.email ?? 'Not set'}\n\nTotal Reports:    ${profile.stats?.total_reports ?? 0}\nVerified Reports: ${profile.stats?.verified_reports ?? 0}`,
          })}
        >
          <View style={S.avatar}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            {loading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <>
                  <Text variant="h5">{profile?.full_name ?? 'User'}</Text>
                  <Text variant="bodySmall" color="textSecondary">{profile?.phone_number ?? ''}</Text>
                  <Text variant="bodySmall" color="textSecondary">{profile?.email ?? 'No email set'}</Text>
                </>
            }
          </View>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M9 18l6-6-6-6" stroke={colors.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        {/* ── Notifications ── */}
        <Label>NOTIFICATIONS</Label>
        <Row label="Push Notifications" subtitle="Disaster alerts near you">
          <Switch value={pushNotif} onValueChange={v => { setPushNotif(v); toggle(P_PUSH, v); }}
            trackColor={{ false: colors.gray300, true: colors.success }} thumbColor="#fff" />
        </Row>
        <Row label="SMS Alerts" subtitle="Critical emergencies only">
          <Switch value={smsAlerts} onValueChange={v => { setSmsAlerts(v); toggle(P_SMS, v); }}
            trackColor={{ false: colors.gray300, true: colors.success }} thumbColor="#fff" />
        </Row>
        <Row label="Email Updates" subtitle="Weekly disaster summaries">
          <Switch value={emailUpdates} onValueChange={v => { setEmailUpdates(v); toggle(P_EMAIL, v); }}
            trackColor={{ false: colors.gray300, true: colors.success }} thumbColor="#fff" />
        </Row>

        {/* ── Location ── */}
        <Label>LOCATION & PRIVACY</Label>
        <Row label="Location Services" subtitle="Required for nearby disaster alerts">
          <Switch value={locationServices} onValueChange={v => { setLocationServices(v); toggle(P_LOC, v); }}
            trackColor={{ false: colors.gray300, true: colors.success }} thumbColor="#fff" />
        </Row>
        <NavRow label="Privacy Policy" onPress={() => setModal({ title: 'Privacy Policy', body: PRIVACY })} />

        {/* ── About ── */}
        <Label>ABOUT</Label>
        <NavRow label="About DRS" rightText="v1.0.0" onPress={() => setModal({ title: 'About DRS', body: ABOUT })} />
        <NavRow label="Terms & Conditions" onPress={() => setModal({ title: 'Terms & Conditions', body: TERMS })} />
        <NavRow label="Contact Support" rightText="support@drs.ie"
          onPress={() => Linking.openURL('mailto:support@drs.ie').catch(() => Alert.alert('Error', 'Could not open mail app'))} />

        {/* ── Logout ── */}
        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={{ color: colors.error, fontWeight: '600', fontSize: 16 }}>Log Out</Text>
        </TouchableOpacity>

        <Text variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', paddingVertical: spacing.xl }}>
          DRS App • Version 1.0.0
        </Text>
      </ScrollView>

      {/* Content modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={S.overlay}>
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text variant="h4">{modal?.title}</Text>
              <TouchableOpacity onPress={() => setModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 22, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="bodyMedium" color="textSecondary" style={{ lineHeight: 24 }}>
                {modal?.body}
              </Text>
              <View style={{ height: spacing.xxxl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────
const Label: React.FC<{ children: string }> = ({ children }) => (
  <Text variant="labelLarge" color="textSecondary" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm, letterSpacing: 0.5 }}>
    {children}
  </Text>
);

const Row: React.FC<{ label: string; subtitle?: string; children: React.ReactNode }> = ({ label, subtitle, children }) => (
  <View style={S.row}>
    <View style={{ flex: 1 }}>
      <Text variant="bodyLarge" color="textPrimary">{label}</Text>
      {subtitle ? <Text variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
    {children}
  </View>
);

const NavRow: React.FC<{ label: string; rightText?: string; onPress: () => void }> = ({ label, rightText, onPress }) => (
  <TouchableOpacity style={S.row} onPress={onPress} activeOpacity={0.7}>
    <Text variant="bodyLarge" color="textPrimary" style={{ flex: 1 }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {rightText ? <Text variant="bodySmall" color="textSecondary">{rightText}</Text> : null}
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={colors.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: spacing.lg, padding: spacing.lg,
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  logoutBtn: {
    margin: spacing.lg, padding: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.error,
    alignItems: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
});

export default SettingsScreen;