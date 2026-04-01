// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/LoginScreen/LoginScreen.tsx
// CORRECTED - AuthTemplate uses children, not form prop!
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader } from '@organisms/AuthHeader';
import { LoginForm } from '@organisms/LoginForm';
import { authService, formatPhoneForApi, ApiError } from '@services/authService';
import type { LoginScreenProps } from '@types/navigation';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (phoneNumber: string, countryCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Format phone number for API: +353892039542
      const formattedPhone = formatPhoneForApi(countryCode, phoneNumber);

      // Call login API
      await authService.login({
        phone_number: formattedPhone,
      });

      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', {
        phoneNumber: formattedPhone,
        countryCode: countryCode,
        isSignup: false,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupPress = () => {
    navigation.navigate('Signup');
  };

  const handleResponderPress = () => {
    navigation.navigate('ResponderLogin');
  };

  return (
    <AuthTemplate
      header={
        <AuthHeader
          title="Welcome Back"
          subtitle="Log in to continue"
        />
      }
    >
      <LoginForm
        onSubmit={handleLogin}
        onSignupPress={handleSignupPress}
        onResponderPress={handleResponderPress}
        isLoading={isLoading}
        error={error}
      />
    </AuthTemplate>
  );
};

export default LoginScreen;