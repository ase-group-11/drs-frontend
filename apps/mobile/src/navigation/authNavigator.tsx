import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@screens/LoginScreen';
import { SignupScreen } from '@screens/SignupScreen';
import { OTPVerificationScreen } from '@screens/OTPVerificationScreen';
// import { WelcomeScreen } from '@screens/WelcomeScreen';
import { ResponderLoginScreen } from '@screens/ResponderLoginScreen';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      {/* <Stack.Screen name="Welcome" component={WelcomeScreen} /> */}
      <Stack.Screen name="ResponderLogin" component={ResponderLoginScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;