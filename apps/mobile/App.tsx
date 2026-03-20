// ═══════════════════════════════════════════════════════════════════════════
// FILE: App.tsx
// FINAL - Listens for auth changes and switches navigators automatically
// ═══════════════════════════════════════════════════════════════════════════
import { LogBox } from 'react-native';
 
// Ignore the animation error - it's a React Native bug, not our code
LogBox.ignoreLogs([
  'this._listeners.forEach is not a function',
  'Animated: `useNativeDriver` was not specified',
]);
import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Screens
import { LoginScreen } from '@screens/LoginScreen';
import { SignupScreen } from '@screens/SignupScreen';
import { OTPVerificationScreen } from '@screens/OTPVerificationScreen';

// Main App Navigation
import { MainNavigator } from '@navigation/MainNavigator';
import { colors } from '@theme/colors';

const Stack = createNativeStackNavigator();

// Helper to get token
const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = React.useRef(AppState.currentState);

  // Check auth status
  const checkAuthStatus = async () => {
    try {
      const token = await getStoredToken();
      
      if (token) {
        console.log('Token found, user is authenticated');
        setIsAuthenticated(true);
      } else {
        console.log('No token found, show login');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // ✅ Listen for app state changes (when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, check auth again
        checkAuthStatus();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ Poll for auth changes every 2 seconds (detects login)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Show loading
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.white 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // NOT LOGGED IN
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            </>
          ) : (
            // LOGGED IN
            <Stack.Screen name="Main" component={MainNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;