import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {authStackParamList} from './types';
import {authRoutes} from '../config/routes';
import {RequestOtpScreen, VerifyOtpScreen} from '../screens/auth';

const AuthStack = createNativeStackNavigator<authStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName={authRoutes.requestOtp}>
      <AuthStack.Screen
        name={authRoutes.requestOtp}
        component={RequestOtpScreen}
        options={{title: 'Request OTP'}}
      />
      <AuthStack.Screen
        name={authRoutes.verifyOtp}
        component={VerifyOtpScreen}
        options={{title: 'Verify OTP'}}
      />
    </AuthStack.Navigator>
  );
}

export default AuthNavigator;