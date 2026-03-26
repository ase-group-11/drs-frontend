// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ProfileScreen/ProfileScreen.tsx
// FIXED: @/components/atoms/Text → @atoms/Text
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProfileMenu } from '@organisms/ProfileMenu';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { authService } from '@services/authService';
import Svg, { Path } from 'react-native-svg';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [userName, setUserName]     = useState('John Doe');
  const [userPhone, setUserPhone]   = useState('+353 1 234 5678');
  const [userInitials, setUserInitials] = useState('JD');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = await authService.getStoredUser();
    if (user) {
      setUserName(user.full_name);
      setUserPhone(user.phone_number);
      setUserInitials(user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase());
    }
  };

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={colors.white}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text variant="h4" style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ProfileMenu
        name={userName}
        phone={userPhone}
        role="Citizen"
        initials={userInitials}
        alertCount={5}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontWeight: '600' },
  placeholder: { width: 40 },
});

export default ProfileScreen;