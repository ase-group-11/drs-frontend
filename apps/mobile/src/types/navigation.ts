// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/types/navigation.ts  (UPDATED)
//
// Added: ResponderSignup, ResponderForgotPassword to AuthStackParamList
// ═══════════════════════════════════════════════════════════════════════════

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps }   from '@react-navigation/native';
import type { BottomTabScreenProps }   from '@react-navigation/bottom-tabs';

// ── Auth Stack ──────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login:                    undefined;
  Signup:                   undefined;
  OTPVerification: {
    phoneNumber:  string;
    countryCode?: string;
    isSignup:     boolean;
    userName?:    string;
    email?:       string;
  };
  Welcome: {
    isNewUser: boolean;
  };
  ResponderLogin:           undefined;
  ResponderSignup:          undefined;          // ← NEW
  ResponderForgotPassword:  undefined;          // ← NEW
};

// ── Main Tab Navigator ──────────────────────────────────────────────────────
export type MainTabParamList = {
  Home:      undefined;
  MyReports: undefined;
  Alerts:    undefined;
  Profile:   undefined;
};

// ── Main Stack Navigator ────────────────────────────────────────────────────
export type MainStackParamList = {
  MainTabs:       undefined;
  Home:           undefined;
  MyReports:      undefined;
  Alerts:         undefined;
  Profile:        undefined;
  ReportDisaster: undefined;
  Settings:       undefined;
  HelpSupport:    undefined;
  EvacuationPlans: undefined;
  ReportDetail:   { reportId: string };
  ActiveMissions:    undefined;
  DisasterCommand:   undefined;
  DisasterDetail:    { disasterId: string };
  CompletedMissions: undefined;
  MyCrew:            undefined;
  UnitStatus:        undefined;
  DisasterTimeline:  { disasterId: string; trackingId?: string };

  // Report Disaster flow
  ReportLocation: undefined;
  ReportType: {
    location: { latitude: number; longitude: number; address: string };
  };
  ReportDetails: {
    location: { latitude: number; longitude: number; address: string };
    type:     string;
    severity: string;
  };
  ReportReview: {
    location:         { latitude: number; longitude: number; address: string };
    type:             string;
    severity:         string;
    description:      string;
    photos:           string[];
    peopleAffected:   string;
    additionalDetails: string[];
  };
  ReportSuccess: { reportId: string };
};

// ── Root Stack ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// ── Screen Props ────────────────────────────────────────────────────────────

// Auth
export type LoginScreenProps                   = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps                  = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
export type OTPVerificationScreenProps         = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;
export type WelcomeScreenProps                 = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;
export type ResponderLoginScreenProps          = NativeStackScreenProps<AuthStackParamList, 'ResponderLogin'>;
export type ResponderSignupScreenProps         = NativeStackScreenProps<AuthStackParamList, 'ResponderSignup'>;
export type ResponderForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ResponderForgotPassword'>;

// Main (tab + stack composite)
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

// Report flow
export type ReportLocationScreenProps = NativeStackScreenProps<MainStackParamList, 'ReportLocation'>;
export type ReportTypeScreenProps     = NativeStackScreenProps<MainStackParamList, 'ReportType'>;
export type ReportDetailsScreenProps  = NativeStackScreenProps<MainStackParamList, 'ReportDetails'>;
export type ReportReviewScreenProps   = NativeStackScreenProps<MainStackParamList, 'ReportReview'>;
export type ReportSuccessScreenProps  = NativeStackScreenProps<MainStackParamList, 'ReportSuccess'>;

// ── Global Navigation Declaration ───────────────────────────────────────────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}