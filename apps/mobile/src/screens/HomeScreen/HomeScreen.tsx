// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/HomeScreen/HomeScreen.tsx
// FEATURE: Click filter category → fly to nearest disaster of that type
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapHeader } from '@organisms/MapHeader';
import { DisasterMap } from '@organisms/DisasterMap';
import { FilterTabs } from '@organisms/FilterTabs';
import { MapTemplate } from '@templates/MapTemplate';
import { mapService } from '@services/mapService';
import type { Disaster, DisasterFilter } from '../../types/disaster';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@types/navigation';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const FILTERS: DisasterFilter[] = [
  { id: 'all', label: '📍 All', icon: '📍' },
  { id: 'fire', label: '🔥 Fire', icon: '🔥', type: 'fire' },
  { id: 'flood', label: '🌊 Flood', icon: '🌊', type: 'flood' },
  { id: 'storm', label: '💨 Storm', icon: '💨', type: 'storm' },
  { id: 'accident', label: '🚗 Accident', icon: '🚗', type: 'accident' },
  { id: 'earthquake', label: '🏚️ Earthquake', icon: '🏚️', type: 'earthquake' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [filteredDisasters, setFilteredDisasters] = useState<Disaster[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [notificationCount] = useState(0);
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
      const filtered = disasters.filter(d => d.type === selectedFilter);
      setFilteredDisasters(filtered);
    }
  }, [selectedFilter, disasters]);

  const loadDisasters = async () => {
    try {
      const bounds = mapService.formatBounds(53.30, -6.35, 53.40, -6.20);
      const data = await mapService.getDisasters(bounds, 100);
      
      console.log('Loaded disasters:', data.length);
      setDisasters(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load disasters:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load disaster data. Please try again.', [{ text: 'OK' }]);
    }
  };

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.full_name || 'User');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // ✅ Handle filter selection - fly to nearest disaster of that type
  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    
    // If not "all", find nearest disaster of that type and fly to it
    if (filterId !== 'all') {
      const disastersOfType = disasters.filter(d => d.type === filterId);
      
      if (disastersOfType.length > 0) {
        // Get the first disaster of this type
        const nearestDisaster = disastersOfType[0];
        
        console.log(`Flying to nearest ${filterId}: ${nearestDisaster.id}`);
        
        // Trigger fly-to via callback to DisasterMap
        if (mapRef.current?.flyToDisaster) {
          mapRef.current.flyToDisaster(nearestDisaster);
        }
      } else {
        Alert.alert(
          'No Disasters Found',
          `There are no ${filterId} disasters in the current area.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleReportDisaster = () => {
    navigation.navigate('ReportDisaster');
  };

  const handleNotifications = () => {
    navigation.navigate('Alerts');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handleMenuPress = () => {
    Alert.alert(
      'Menu',
      'What would you like to do?',
      [
        { text: 'My Reports', onPress: () => navigation.navigate('MyReports') },
        { text: 'Alerts', onPress: () => navigation.navigate('Alerts') },
        { text: 'Profile', onPress: () => navigation.navigate('Profile') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getUserInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <MapTemplate
      header={
        <MapHeader
          location="Dublin, Ireland"
          notificationCount={notificationCount}
          userInitials={getUserInitials(userName)}
          onMenuPress={handleMenuPress}
          onNotificationPress={handleNotifications}
          onAvatarPress={handleProfile}
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
          onReport={handleReportDisaster}
          selectedFilter={selectedFilter}
        />
      }
    />
  );
};

export default HomeScreen;