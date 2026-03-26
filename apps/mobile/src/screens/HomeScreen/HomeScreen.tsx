// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/HomeScreen/HomeScreen.tsx
// Drawer uses original working Modal + fade pattern (no Animated API)
// Enhanced with full ProfileMenu content and all screen navigation
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Alert, Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapHeader }   from '@organisms/MapHeader';
import { DisasterMap } from '@organisms/DisasterMap';
import { FilterTabs }  from '@organisms/FilterTabs';
import { MapTemplate } from '@templates/MapTemplate';
import { ProfileMenu } from '@organisms/ProfileMenu';
import { ResponderProfileMenu } from '@organisms/ResponderProfileMenu';
import { mapService }  from '@services/mapService';
import { authService } from '@services/authService';
import { colors }      from '@theme/colors';
import type { Disaster, DisasterFilter } from '../../types/disaster';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
interface HomeScreenProps { navigation: HomeScreenNavigationProp; }

const FILTERS: DisasterFilter[] = [
  { id: 'all',       label: '📍 All',        icon: '📍' },
  { id: 'fire',      label: '🔥 Fire',       icon: '🔥', type: 'fire' },
  { id: 'flood',     label: '🌊 Flood',      icon: '🌊', type: 'flood' },
  { id: 'storm',     label: '⛈️ Storm',      icon: '⛈️', type: 'storm' },
  { id: 'earthquake',label: '🏚️ Earthquake', icon: '🏚️', type: 'earthquake' },
  { id: 'hurricane', label: '🌀 Hurricane',  icon: '🌀', type: 'hurricane' },
  { id: 'tsunami',   label: '🌊 Tsunami',    icon: '🌊', type: 'tsunami' },
  { id: 'heatwave',  label: '🌡️ Heatwave',   icon: '🌡️', type: 'heatwave' },
  { id: 'other',     label: '⚠️ Other',      icon: '⚠️', type: 'other' },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [disasters, setDisasters]                 = useState<Disaster[]>([]);
  const [filteredDisasters, setFilteredDisasters] = useState<Disaster[]>([]);
  const [selectedFilter, setSelectedFilter]       = useState('all');
  const [loading, setLoading]                     = useState(true);
  const [userName, setUserName]                   = useState('User');
  const [userPhone, setUserPhone]                 = useState('');
  const [userInitials, setUserInitials]           = useState('U');
  const [notificationCount]                       = useState(0);
  const [menuVisible, setMenuVisible]             = useState(false);
  const [isResponder, setIsResponder]             = useState(false);
  const [responderData, setResponderData]         = useState<any>(null);
  const [missionCount, setMissionCount]           = useState(0);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    loadDisasters();
    loadUserData();
    const interval = setInterval(loadDisasters, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredDisasters(disasters);
    } else {
      setFilteredDisasters(disasters.filter(d => d.type === selectedFilter));
    }
  }, [selectedFilter, disasters]);

  const loadDisasters = async () => {
    try {
      // Greater Dublin bounds
      const bounds = mapService.formatBounds(53.20, -6.45, 53.45, -6.05);
      const data   = await mapService.getDisasters(bounds, 100);
      setDisasters(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load disasters:', error);
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const role = await AsyncStorage.getItem('@auth/user_role');
      const user = await authService.getStoredUser();
      if (user) {
        const name = user.full_name || 'User';
        setUserName(name);
        setUserPhone(user.phone_number || '');
        setUserInitials(getInitials(name));
      }
      if (role === 'responder' && user) {
        setIsResponder(true);
        setResponderData(user);
        // Load active mission count — need unit UUID not employee_id
        try {
          const { authRequest } = require('@services/authService');
          const unitsData = await authRequest('/emergency-units/');
          const units: any[] = unitsData?.units ?? [];
          const userDept = (user.department ?? '').toUpperCase();
          const myUnit = units.find((u: any) => u.department?.toUpperCase() === userDept) ?? units[0];
          if (myUnit?.id) {
            const data = await authRequest(`/deployments/unit/${myUnit.id}/active`);
            setMissionCount(data?.count ?? 0);
          }
        } catch { /* no missions or unit not found — badge stays 0 */ }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    if (filterId !== 'all') {
      const match = disasters.filter(d => d.type === filterId);
      if (match.length > 0) {
        mapRef.current?.flyToDisaster?.(match[0]);
      }
    }
  };

  const handleMenuNavigate = (screen: string) => {
    setMenuVisible(false);
    setTimeout(() => navigation.navigate(screen as any), 300);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    setTimeout(() => {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
          },
        },
      ]);
    }, 300);
  };

  return (
    <>
      <MapTemplate
        header={
          <MapHeader
            location="Dublin, Ireland"
            notificationCount={notificationCount}
            userInitials={userInitials}
            onMenuPress={() => setMenuVisible(true)}
            onNotificationPress={() => navigation.navigate('Alerts' as any)}
            onAvatarPress={() => navigation.navigate('Profile' as any)}
          />
        }
        filterBar={
          <FilterTabs
            filters={FILTERS}
            selected={selectedFilter}
            onSelect={handleFilterSelect}
          />
        }
        map={
          <DisasterMap
            ref={mapRef}
            disasters={filteredDisasters}
            loading={loading}
            onReport={() => navigation.navigate('ReportDisaster' as any)}
            selectedFilter={selectedFilter}
          />
        }
      />

      {/* ── Left slide drawer using original working Modal + fade ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          {/* stopPropagation so tapping inside the drawer doesn't close it */}
          <TouchableOpacity
            style={styles.drawerContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            {isResponder && responderData ? (
              <ResponderProfileMenu
                name={responderData.full_name ?? userName}
                email={responderData.email ?? ''}
                role={responderData.role ?? 'staff'}
                department={responderData.department ?? 'fire'}
                employeeId={responderData.employee_id}
                initials={userInitials}
                missionCount={missionCount}
                onNavigate={handleMenuNavigate}
                onLogout={handleLogout}
              />
            ) : (
              <ProfileMenu
                name={userName}
                phone={userPhone}
                role="Citizen"
                initials={userInitials}
                alertCount={5}
                onNavigate={handleMenuNavigate}
                onLogout={handleLogout}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  drawerContainer: {
    width: '82%',
    height: '100%',
    backgroundColor: colors.white,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 16,
  },
});

export default HomeScreen;