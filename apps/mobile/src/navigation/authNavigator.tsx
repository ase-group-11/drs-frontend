// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/AuthNavigator.tsx  (UPDATED)
//
// Added: ResponderSignup, ResponderForgotPassword screens
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen }                    from '@screens/LoginScreen';
import { SignupScreen }                   from '@screens/SignupScreen';
import { OTPVerificationScreen }          from '@screens/OTPVerificationScreen';
import { ResponderLoginScreen }           from '@screens/ResponderLoginScreen';
import { ResponderSignupScreen }          from '@screens/ResponderSignupScreen';
import { ResponderForgotPasswordScreen }  from '@screens/ResponderForgotPasswordScreen';
import type { AuthStackParamList }        from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login"                    component={LoginScreen} />
      <Stack.Screen name="Signup"                   component={SignupScreen} />
      <Stack.Screen name="OTPVerification"          component={OTPVerificationScreen} />
      <Stack.Screen name="ResponderLogin"           component={ResponderLoginScreen} />
      <Stack.Screen name="ResponderSignup"          component={ResponderSignupScreen} />
      <Stack.Screen name="ResponderForgotPassword"  component={ResponderForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;