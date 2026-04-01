// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE NAVIGATION TYPES - Updated for Report Disaster Flow
// src/types/navigation.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ───────────────────────────────────────────────────────────────────────────
// Auth Stack (Login flow)
// ───────────────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTPVerification: {
    phoneNumber: string;
    countryCode?: string;   // passed from login/signup so display is correct
    isSignup: boolean;
    userName?: string;
    email?: string;
  };
  Welcome: {
    isNewUser: boolean;
  };
  ResponderLogin: undefined;
};

// ───────────────────────────────────────────────────────────────────────────
// Main Tab Navigator (Bottom tabs - Home, Reports, Alerts, Profile)
// ───────────────────────────────────────────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  MyReports: undefined;
  Alerts: undefined;
  Profile: undefined;
};

// ───────────────────────────────────────────────────────────────────────────
// Main Stack Navigator (Wraps Tabs + Report Disaster Flow)
// ───────────────────────────────────────────────────────────────────────────
export type MainStackParamList = {
  // Main tabs
  MainTabs: undefined;
  
  // Report Disaster flow (5 screens)
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
  
  // Other screens (if needed)
  Settings?: undefined;
  DisasterDetail?: { disasterId: string };
  ReportDetail?: { reportId: string };
};

// ───────────────────────────────────────────────────────────────────────────
// Root Stack (Auth or Main)
// ───────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN PROPS TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Auth Screen Props
// ───────────────────────────────────────────────────────────────────────────
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
export type OTPVerificationScreenProps = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;
export type WelcomeScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

// ───────────────────────────────────────────────────────────────────────────
// Tab Screen Props (Home, MyReports, Alerts, Profile)
// These screens can navigate to both tabs AND stack screens
// ───────────────────────────────────────────────────────────────────────────
export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

export type MyReportsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyReports'>,
  NativeStackScreenProps<MainStackParamList>
>;

export type AlertsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Alerts'>,
  NativeStackScreenProps<MainStackParamList>
>;

export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<MainStackParamList>
>;

// ───────────────────────────────────────────────────────────────────────────
// Report Disaster Screen Props
// ───────────────────────────────────────────────────────────────────────────
export type ReportLocationScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportLocation'>;
export type ReportTypeScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportType'>;
export type ReportDetailsScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportDetails'>;
export type ReportReviewScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportReview'>;
export type ReportSuccessScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportSuccess'>;

// ───────────────────────────────────────────────────────────────────────────
// Global Navigation Declaration
// ───────────────────────────────────────────────────────────────────────────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/*
// ─────────────────────────────────────────────────────────────────────────
// Example 1: HomeScreen (Tab screen - can navigate to tabs AND stack)
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import type { HomeScreenProps } from '../types/navigation';

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleReport = () => {
    navigation.navigate('ReportLocation'); // ✅ Navigate to stack screen
  };

  const goToAlerts = () => {
    navigation.navigate('Alerts'); // ✅ Navigate to other tab
  };

  return (
    // ... your component
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Example 2: ReportLocationScreen (Stack screen)
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ReportLocationScreenProps } from '../types/navigation';

export const ReportLocationScreen: React.FC<ReportLocationScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const handleNext = () => {
    navigation.navigate('ReportType', {
      location: {
        latitude: 53.3498,
        longitude: -6.2603,
        address: "123 O'Connell Street, Dublin 1",
      }
    });
  };

  const handleClose = () => {
    navigation.navigate('MainTabs'); // Go back to tabs
  };

  return (
    // ... your component
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Example 3: ReportTypeScreen (receives params)
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ReportTypeScreenProps } from '../types/navigation';

export const ReportTypeScreen: React.FC<ReportTypeScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { location } = route.params; // ✅ TypeScript knows the shape
  
  const handleNext = () => {
    navigation.navigate('ReportDetails', {
      location,
      type: 'fire',
      severity: 'high',
    });
  };

  return (
    // ... your component
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Example 4: LoginScreen (Auth screen)
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import type { LoginScreenProps } from '../types/navigation';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleOTP = () => {
    navigation.navigate('OTPVerification', {
      phoneNumber: '+353892039542',
      isSignup: false,
    });
  };

  return (
    // ... your component
  );
};
*/