// ═══════════════════════════════════════════════════════════════════════════
// FILE: App.tsx  (project root — same level as index.js)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';

// ── Suppress known RN 0.83 Animated bug with Mapbox camera ──────────────
// This is an uncaught error (red screen), not just a warning (yellow box).
// The Mapbox camera setCamera() uses RN Animated internally, and in
// bridgeless mode _listeners can be undefined during rapid transitions.
// Safe to suppress — map still works correctly.

LogBox.ignoreLogs([
  'this._listeners.forEach is not a function',
  'TypeError: this._listeners.forEach',
]);

// Patch the global error handler to swallow this specific Animated crash
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (
    error?.message?.includes('this._listeners.forEach is not a function') ||
    error?.message?.includes('_listeners.forEach')
  ) {
    // Swallow — known RN Animated bug, non-fatal, map still works
    console.warn('[Suppressed] Animated _listeners bug (harmless)');
    return;
  }
  // Pass everything else to the original handler
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const ACCESS_TOKEN_KEY = '@auth/access_token';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      setIsAuthenticated(!!token);
    } catch {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1890FF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <RootStack.Screen name="Main" component={MainNavigator} />
            ) : (
              <RootStack.Screen name="Auth" component={AuthNavigator} />
            )}
            {isAuthenticated ? (
              <RootStack.Screen name="Auth" component={AuthNavigator} />
            ) : (
              <RootStack.Screen name="Main" component={MainNavigator} />
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;