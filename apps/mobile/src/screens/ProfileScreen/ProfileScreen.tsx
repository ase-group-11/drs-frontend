// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/ProfileScreen/ProfileScreen.tsx
//
// Role-aware profile screen:
//   citizen  → blue theme + ProfileMenu
//   responder → red theme + ResponderProfileMenu
// ═══════════════════════════════════════════════════════════════════════════

import { API } from '@services/apiConfig';
import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileMenu }          from '@organisms/ProfileMenu';
import { ResponderProfileMenu } from '@organisms/ResponderProfileMenu';
import { Text }   from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { authService } from '@services';
import Svg, { Path } from 'react-native-svg';

const RED = '#DC2626';

export const ProfileScreen: React.FC = () => {
  const navigation  = useNavigation<any>();
  const [userName, setUserName]     = useState('');
  const [userPhone, setUserPhone]   = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const [isResponder, setIsResponder] = useState(false);
  const [responderData, setResponderData] = useState<any>(null);
  const [missionCount, setMissionCount] = useState(0);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const role = await AsyncStorage.getItem('@auth/user_role');
      const user = await authService.getStoredUser() as any;

      if (!user) return;

      const name = user.full_name || user.name || 'User';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      setUserName(name);
      setUserInitials(initials);

      if (role === 'responder') {
        setIsResponder(true);
        setResponderData(user);
        setUserPhone(user.phone_number || '');
        // Load mission count
        try {
          const { authRequest, getUserUnitInfo } = require('@services/authService');
          const { unitId } = await getUserUnitInfo();
          if (unitId) {
            const data = await authRequest(API.deployments.unitActive(unitId));
            setMissionCount(data?.count ?? (data?.missions?.length ?? 0));
          }
        } catch {}
      } else {
        setUserPhone(user.phone_number || '');
        // Load unread notification count
        try {
          const { notificationStore } = require('@services/notificationStore');
          setAlertCount(await notificationStore.unreadCount());
        } catch {}
      }
    } catch (e) {
      console.error('[ProfileScreen] loadUserData failed:', e);
    }
  };

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
  };

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

  const headerColor = isResponder ? RED : colors.primary;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={headerColor} />

      {isResponder && responderData ? (
        <ResponderProfileMenu
          name={responderData.full_name ?? userName}
          email={responderData.email ?? ''}
          role={responderData.role ?? 'staff'}
          department={responderData.department ?? 'fire'}
          employeeId={responderData.employee_id}
          initials={userInitials}
          missionCount={missionCount}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      ) : (
        <ProfileMenu
          name={userName}
          phone={userPhone}
          role="Citizen"
          initials={userInitials}
          alertCount={alertCount}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backButton:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontWeight: '600' },
  placeholder: { width: 40 },
});

export default ProfileScreen;