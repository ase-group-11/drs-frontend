// ═══════════════════════════════════════════════════════════════════════════
// UPDATED MainNavigator - Wraps tabs in Stack to add Report screens
// src/navigation/MainNavigator.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@screens/HomeScreen';
import { MyReportsScreen } from '@screens/MyReportsScreen';
import { AlertsScreen } from '@screens/AlertsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { ReportDisasterScreen } from '@screens/ReportDisaster';  // ✅ From index.ts


// ✅ Import Report Disaster screens
import {
  ReportLocationScreen,
  ReportTypeScreen,
  ReportDetailsScreen,
  ReportReviewScreen,
  ReportSuccessScreen,
} from '@screens/ReportDisaster';

import { colors } from '@theme/colors';
import Svg, { Path, Circle } from 'react-native-svg';

// ✅ Update types to include Report screens
export type MainTabParamList = {
  Home: undefined;
  MyReports: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ReportLocation: undefined;
  ReportType: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  ReportDetails: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    type: string;
    severity: string;
  };
  ReportReview: {
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    type: string;
    severity: string;
    description: string;
    photos: string[];
    peopleAffected: string;
    additionalDetails: string[];
  };
  ReportSuccess: {
    reportId: string;
  };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

// Icons (unchanged)
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={focused ? `${colors.primary}20` : 'none'}
    />
  </Svg>
);

const ReportsIcon = ({ focused }: { focused: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertsIcon = ({ focused }: { focused: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={focused ? `${colors.primary}20` : 'none'}
    />
    <Path
      d="M12 9v4M12 17h.01"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const ProfileIcon = ({ focused }: { focused: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="7"
      r="4"
      stroke={focused ? colors.primary : colors.gray500}
      strokeWidth="2"
    />
  </Svg>
);

// ✅ Tab Navigator (same as before)
const TabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => {
        switch (route.name) {
          case 'Home': return <HomeIcon focused={focused} />;
          case 'MyReports': return <ReportsIcon focused={focused} />;
          case 'Alerts': return <AlertsIcon focused={focused} />;
          case 'Profile': return <ProfileIcon focused={focused} />;
          default: return null;
        }
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray500,
      tabBarStyle: { height: 62, paddingBottom: 10, paddingTop: 8 },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="MyReports" component={MyReportsScreen} options={{ tabBarLabel: 'Reports' }} />
    <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alerts' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

// ✅ NEW: Main Stack Navigator (wraps tabs + adds Report screens)
export const MainNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    {/* Main app with bottom tabs */}
    <Stack.Screen name="MainTabs" component={TabNavigator} />


<Stack.Screen 
  name="ReportDisaster" 
  component={ReportDisasterScreen}
  options={{
    presentation: 'fullScreenModal',
    animation: 'slide_from_bottom',
    headerShown: false,
  }}
/>

  </Stack.Navigator>
);

export default MainNavigator;