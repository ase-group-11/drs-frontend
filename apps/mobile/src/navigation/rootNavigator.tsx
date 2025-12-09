import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {rootStackParamList} from './types';
import AuthNavigator from './authNavigator';

const RootStack = createNativeStackNavigator<rootStackParamList>();

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      <RootStack.Screen name="AuthStack" component={AuthNavigator} />
    </RootStack.Navigator>
  );
}

export default RootNavigator;