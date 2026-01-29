import React, { useState } from 'react';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader } from '@organisms/AuthHeader';
import { LoginForm } from '@organisms/LoginForm';
import type { LoginScreenProps } from '@types/navigation';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (phoneNumber: string, countryCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      // TODO: Call API to send OTP
      // const response = await authService.requestLogin({ mobileNumber: phoneNumber, countryCode });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', {
        mobileNumber: phoneNumber,
        countryCode,
        isSignup: false,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupPress = () => {
    navigation.navigate('Signup');
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
        isLoading={isLoading}
        error={error}
      />
    </AuthTemplate>
  );
};

export default LoginScreen;
