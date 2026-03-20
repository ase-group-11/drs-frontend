// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/MainNavigator.tsx
// FIXED - NO BOTTOM TAB BAR, Stack navigation only
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@screens/HomeScreen';
import { MyReportsScreen } from '@screens/MyReportsScreen';
import { AlertsScreen } from '@screens/AlertsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { ReportDisasterScreen } from '@screens/ReportDisaster';

// ✅ All screens in one stack - NO TABS
export type MainStackParamList = {
  Home: undefined;
  MyReports: undefined;
  Alerts: undefined;
  Profile: undefined;
  ReportDisaster: undefined;
  SavedLocations: undefined;
  Settings: undefined;
  HelpSupport: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// ✅ Stack Navigator ONLY - No bottom tabs!
export const MainNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false, // No headers, we have MapHeader
      animation: 'slide_from_right',
    }}
  >
    {/* Main Screens (accessible from drawer menu) */}
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="MyReports" component={MyReportsScreen} />
    <Stack.Screen name="Alerts" component={AlertsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    
    {/* Other Screens */}
    <Stack.Screen 
      name="ReportDisaster" 
      component={ReportDisasterScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
  </Stack.Navigator>
);

export default MainNavigator;