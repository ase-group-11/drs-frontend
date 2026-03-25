// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/MainNavigator.tsx
// UPDATED: Responder screens (ActiveMissions, MissionProgress) added
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen }               from '@screens/HomeScreen';
import { MyReportsScreen }          from '@screens/MyReportsScreen';
import { AlertsScreen }             from '@screens/AlertsScreen';
import { ProfileScreen }            from '@screens/ProfileScreen';
import { ReportDisasterScreen }     from '@screens/ReportDisaster';
import { SettingsScreen }           from '@screens/SettingsScreen';
import { HelpSupportScreen }        from '@screens/HelpSupportScreen';
import { SavedLocationsScreen }     from '@screens/SavedLocationsScreen';
import { ReportDetailScreen }       from '@screens/ReportDetailScreen';
import { ActiveMissionsScreen }     from '@screens/ActiveMissionsScreen';

export type MainStackParamList = {
  Home:             undefined;
  MyReports:        undefined;
  Alerts:           undefined;
  Profile:          undefined;
  ReportDisaster:   undefined;
  Settings:         undefined;
  HelpSupport:      undefined;
  SavedLocations:   undefined;
  EvacuationPlans:  undefined;
  ReportDetail:     { reportId: string };
  // Responder screens
  ActiveMissions:   undefined;
  MissionProgress:  { deploymentId?: string } | undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    {/* Shared */}
    <Stack.Screen name="Home"            component={HomeScreen} />
    <Stack.Screen name="MyReports"       component={MyReportsScreen} />
    <Stack.Screen name="Alerts"          component={AlertsScreen} />
    <Stack.Screen name="Profile"         component={ProfileScreen} />
    <Stack.Screen name="Settings"        component={SettingsScreen} />
    <Stack.Screen name="HelpSupport"     component={HelpSupportScreen} />
    <Stack.Screen name="SavedLocations"  component={SavedLocationsScreen} />
    <Stack.Screen name="EvacuationPlans" component={SavedLocationsScreen} />
    <Stack.Screen name="ReportDetail"    component={ReportDetailScreen} />

    {/* Responder-only */}
    <Stack.Screen name="ActiveMissions"  component={ActiveMissionsScreen} />
    <Stack.Screen name="MissionProgress" component={ActiveMissionsScreen} />

    {/* Modal */}
    <Stack.Screen
      name="ReportDisaster"
      component={ReportDisasterScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

export default MainNavigator;