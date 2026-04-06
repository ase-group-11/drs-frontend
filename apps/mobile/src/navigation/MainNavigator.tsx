// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/MainNavigator.tsx
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
import { ReportDetailScreen }       from '@screens/ReportDetailScreen';
import { ActiveMissionsScreen }     from '@screens/ActiveMissionsScreen';
import { DisasterCommandScreen }  from '@screens/DisasterCommandScreen';
import { DisasterDetailScreen }   from '@screens/DisasterDetailScreen';
import { CompletedMissionsScreen } from '@screens/CompletedMissionsScreen';
import { MyCrewScreen }           from '@screens/MyCrewScreen';
import { EvacuationPlansScreen }    from '@screens/EvacuationPlansScreen';
import { DisasterTimelineScreen }   from '@screens/DisasterTimelineScreen';

export type MainStackParamList = {
  Home:            undefined;
  MyReports:       undefined;
  Alerts:          undefined;
  Profile:         undefined;
  ReportDisaster:  undefined;
  Settings:        undefined;
  HelpSupport:     undefined;
  EvacuationPlans: undefined;
  ReportDetail:    { reportId: string };
  ActiveMissions:      undefined;
  DisasterCommand:     undefined;
  DisasterDetail:      { disasterId: string };
  CompletedMissions:   undefined;
  MyCrew:              undefined;
  DisasterTimeline:  { disasterId: string; trackingId?: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Home"            component={HomeScreen} />
    <Stack.Screen name="MyReports"       component={MyReportsScreen} />
    <Stack.Screen name="Alerts"          component={AlertsScreen} />
    <Stack.Screen name="Profile"         component={ProfileScreen} />
    <Stack.Screen name="Settings"        component={SettingsScreen} />
    <Stack.Screen name="HelpSupport"     component={HelpSupportScreen} />
    <Stack.Screen name="EvacuationPlans" component={EvacuationPlansScreen} />
    <Stack.Screen name="ReportDetail"    component={ReportDetailScreen} />
    <Stack.Screen name="ActiveMissions"    component={ActiveMissionsScreen} />
    <Stack.Screen name="DisasterCommand"  component={DisasterCommandScreen} />
    <Stack.Screen name="DisasterDetail"   component={DisasterDetailScreen} />
    <Stack.Screen name="CompletedMissions" component={CompletedMissionsScreen} />
    <Stack.Screen name="MyCrew"            component={MyCrewScreen} />
    <Stack.Screen name="DisasterTimeline" component={DisasterTimelineScreen} />
    <Stack.Screen
      name="ReportDisaster"
      component={ReportDisasterScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

export default MainNavigator;