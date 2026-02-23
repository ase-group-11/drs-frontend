// ═══════════════════════════════════════════════════════════════════════════
// UPDATED HomeScreen with correct navigation prop
// src/screens/Home/HomeScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { MapHeader } from '@organisms/MapHeader';
import { DisasterMap } from '@organisms/DisasterMap';
import { FilterTabs } from '@organisms/FilterTabs';
import { MapTemplate } from '@templates/MapTemplate';
import type { Disaster, DisasterFilter } from '../../types/disaster';
import type { TabScreenNavigationProp } from '../../types/navigation'; // ✅ Use composite type

type HomeScreenProps = {
  navigation: TabScreenNavigationProp; // ✅ Can navigate to tabs AND stack screens
};

const MOCK_DISASTERS: Disaster[] = [
  {
    id: '1',
    type: 'fire',
    severity: 'critical',
    title: 'Fire - Critical',
    location: { latitude: 53.3439, longitude: -6.2674, address: "O'Connell Street" },
    reportedAt: new Date(),
    status: 'in_progress',
    unitsResponding: 3,
  },
  {
    id: '2',
    type: 'flood',
    severity: 'high',
    title: 'Flood - High',
    location: { latitude: 53.3406, longitude: -6.2603, address: 'Temple Bar' },
    reportedAt: new Date(),
  },
  {
    id: '3',
    type: 'storm',
    severity: 'medium',
    title: 'Storm - Medium',
    location: { latitude: 53.3498, longitude: -6.2603, address: 'North Wall' },
    reportedAt: new Date(),
  },
  {
    id: '4',
    type: 'power',
    severity: 'low',
    title: 'Power Outage - Low',
    location: { latitude: 53.3373, longitude: -6.2602, address: 'Ballsbridge' },
    reportedAt: new Date(),
  },
];

const FILTERS: DisasterFilter[] = [
  { id: 'all', label: '📍 All Disasters', icon: '📍' },
  { id: 'fire', label: '🔥 Fire', icon: '🔥', type: 'fire' },
  { id: 'flood', label: '🌊 Flood', icon: '🌊', type: 'flood' },
  { id: 'storm', label: '💨 Storm', icon: '💨', type: 'storm' },
  { id: 'accident', label: '🚗 Accident', icon: '🚗', type: 'accident' },
  { id: 'power', label: '⚡ Power', icon: '⚡', type: 'power' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [selected, setSelected] = useState('all');

  const filtered =
    selected === 'all'
      ? MOCK_DISASTERS
      : MOCK_DISASTERS.filter((d) => d.type === selected);

  // ✅ Navigate to Report Disaster flow
  const handleReport = () => {
    navigation.navigate('ReportDisaster');  // Just one screen now!
  };

  // ✅ Navigate to other screens
  const handleNotifications = () => {
    navigation.navigate('Alerts');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <MapTemplate
      header={
        <MapHeader
          location="Dublin, Ireland"
          notificationCount={3}
          userInitials="JD"
          onMenuPress={() => { }}
          onNotificationPress={handleNotifications}
          onAvatarPress={handleProfile}
        />
      }
      filterBar={
        <FilterTabs filters={FILTERS} selected={selected} onSelect={setSelected} />
      }
      map={<DisasterMap disasters={filtered} onReport={handleReport} />}
    />
  );
};

export default HomeScreen;