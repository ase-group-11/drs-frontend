import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProfileMenu } from '@organisms/ProfileMenu';
import { colors } from '@theme/colors';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
  };

  const handleLogout = () => {
    console.log('Logout');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ProfileMenu
        name="John Doe"
        phone="+353 1 234 5678"
        role="Citizen"
        initials="JD"
        alertCount={5}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
});

export default ProfileScreen;
