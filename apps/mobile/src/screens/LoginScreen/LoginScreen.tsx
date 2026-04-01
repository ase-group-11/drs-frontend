// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/LoginScreen/LoginScreen.tsx
// UPDATED: Pass onResponderPress to navigate to ResponderLogin
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader } from '@organisms/AuthHeader';
import { LoginForm } from '@organisms/LoginForm';
import { authService, formatPhoneForApi, ApiError } from '@services/authService';
import type { LoginScreenProps } from '@types/navigation';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const handleLogin = async (phoneNumber: string, countryCode: string) => {
    setIsLoading(true);
    setError('');
    try {
      const formattedPhone = formatPhoneForApi(countryCode, phoneNumber);
      await authService.login({ phone_number: formattedPhone });
      navigation.navigate('OTPVerification', { phoneNumber: formattedPhone, isSignup: false });
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthTemplate header={<AuthHeader title="Welcome Back" subtitle="Log in to continue" />}>
      <LoginForm
        onSubmit={handleLogin}
        onSignupPress={() => navigation.navigate('Signup')}
        onResponderPress={() => navigation.navigate('ResponderLogin' as any)}
        isLoading={isLoading}
        error={error}
      />
    </AuthTemplate>
  );
};

export default LoginScreen;