import {NavigatorScreenParams} from '@react-navigation/native';
import {authRoutes} from '../config/routes';

export type authStackParamList = {
  [authRoutes.requestOtp]: undefined;
  [authRoutes.verifyOtp]: {phoneNumber: string} | undefined;
};

export type rootStackParamList = {
  AuthStack: NavigatorScreenParams<authStackParamList>;
};