// ═══════════════════════════════════════════════════════════════════════════
// FILE: App.tsx  (project root — same level as index.js)
// UPDATED: Checks for stored access token on launch.
//          If token exists → goes straight to Main (no login required).
//          If no token     → shows Auth (Login) screen.
//
// NOTE: Uses relative paths because App.tsx is outside src/ and cannot
//       resolve the @navigation/@types aliases in babel.config.js
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

// ─── Token storage key (must match authService.ts STORAGE_KEYS) ──────────
const ACCESS_TOKEN_KEY = '@auth/access_token';

const App: React.FC = () => {
  // null = still checking, true = authenticated, false = not authenticated
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

  // ── Splash / loading state while checking storage ─────────────────────
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
              // ── Already logged in → go straight to app ──
              <RootStack.Screen name="Main" component={MainNavigator} />
            ) : (
              // ── Not logged in → show login flow ──
              <RootStack.Screen name="Auth" component={AuthNavigator} />
            )}
            {/* Always register both so navigation.reset() works from either side */}
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