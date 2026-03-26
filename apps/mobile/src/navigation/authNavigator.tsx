// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/navigation/AuthNavigator.tsx
// UPDATED: ResponderLogin screen added to auth stack
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen }              from '@screens/LoginScreen';
import { SignupScreen }             from '@screens/SignupScreen';
import { OTPVerificationScreen }    from '@screens/OTPVerificationScreen';
import { ResponderLoginScreen }     from '@screens/ResponderLoginScreen';
import type { AuthStackParamList }  from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Login"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="Login"           component={LoginScreen} />
    <Stack.Screen name="Signup"          component={SignupScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen
      name="ResponderLogin"
      component={ResponderLoginScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

export default AuthNavigator;