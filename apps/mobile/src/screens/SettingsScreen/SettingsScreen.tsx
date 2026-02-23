import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity,
} from 'react-native';
import { SettingItem } from '@molecules/SettingItem';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';

export const SettingsScreen: React.FC = () => {
  const [pushNotif, setPushNotif] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [locationServices, setLocationServices] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4" color="textPrimary">Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account */}
        <View style={styles.section}>
          <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
            ACCOUNT
          </Text>
          <SettingItem label="Profile Information" onPress={() => {}} />
          <SettingItem label="Change Phone Number" rightText="+353 87..." onPress={() => {}} />
          <SettingItem label="Email Settings" rightText="Not set" onPress={() => {}} />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
            NOTIFICATIONS
          </Text>
          <SettingItem
            label="Push Notifications"
            type="toggle"
            value={pushNotif}
            onToggle={setPushNotif}
          />
          <SettingItem
            label="SMS Alerts"
            subtitle="Critical emergencies only"
            type="toggle"
            value={smsAlerts}
            onToggle={setSmsAlerts}
          />
          <SettingItem
            label="Email Updates"
            type="toggle"
            value={emailUpdates}
            onToggle={setEmailUpdates}
          />
          <SettingItem label="Alert Sound" rightText="Default" onPress={() => {}} />
          <SettingItem label="Quiet Hours" rightText="10PM – 7AM" onPress={() => {}} />
        </View>

        {/* Location & Privacy */}
        <View style={styles.section}>
          <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
            LOCATION & PRIVACY
          </Text>
          <SettingItem
            label="Location Services"
            subtitle="Required for disaster alerts"
            type="toggle"
            value={locationServices}
            onToggle={setLocationServices}
          />
          <SettingItem label="Alert Radius" rightText="1 km" onPress={() => {}} />
          <SettingItem label="Privacy Settings" onPress={() => {}} />
        </View>

        {/* App */}
        <View style={styles.section}>
          <Text variant="labelLarge" color="textSecondary" style={styles.sectionTitle}>
            APP
          </Text>
          <SettingItem label="Language" rightText="English" onPress={() => {}} />
          <SettingItem label="About DRS" onPress={() => {}} />
          <SettingItem label="Terms & Conditions" onPress={() => {}} />
          <SettingItem label="Privacy Policy" onPress={() => {}} />
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" color="textSecondary" align="center">
            DRS App • Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionTitle: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  footer: { paddingVertical: spacing.massive },
});

export default SettingsScreen;