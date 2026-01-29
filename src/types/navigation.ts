import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTPVerification: {
    mobileNumber: string;
    countryCode: string;
    isSignup: boolean;
    userName?: string;
  };
  Welcome: {
    isNewUser: boolean;
  };
};

export type MainStackParamList = {
  Home: undefined;
  Map: undefined;
  ReportDisaster: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Screen props types
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
export type OTPVerificationScreenProps = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;
export type WelcomeScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

// Navigation props helper
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
