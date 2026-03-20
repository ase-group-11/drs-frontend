// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/screens/OTPVerificationScreen/OTPVerificationScreen.tsx
// CORRECTED - AuthTemplate uses children + token storage + proper navigation
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader } from '@organisms/AuthHeader';
import { OTPVerificationForm } from '@organisms/OTPVerificationForm';
import { authService, ApiError } from '@services/authService';
import type { OTPVerificationScreenProps } from '@types/navigation';

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { phoneNumber, isSignup, userName, email } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getDisplayPhone = (fullPhone: string): string => {
    if (fullPhone.length > 6) {
      return fullPhone.slice(-9);
    }
    return fullPhone;
  };

  const getCountryCode = (fullPhone: string): string => {
    const match = fullPhone.match(/^(\+\d{1,4})/);
    return match ? match[1] : '+353';
  };

  const handleVerify = async (otp: string) => {
    setIsLoading(true);
    setError('');

    try {
      let response;

      if (isSignup) {
        // Verify registration OTP
        response = await authService.verifyRegistration({
          phone_number: phoneNumber,
          otp,
        });
        console.log('Registration successful:', response);
      } else {
        // Verify login OTP
        response = await authService.verifyLogin({
          phone_number: phoneNumber,
          otp,
        });
        console.log('Login successful:', response);
      }

      // ✅ SAVE TOKENS TO ASYNCSTORAGE
      if (response.tokens) {
        await AsyncStorage.setItem('accessToken', response.tokens.access_token);
        await AsyncStorage.setItem('refreshToken', response.tokens.refresh_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('Tokens saved successfully');
      }

      // ✅ NAVIGATE TO MAIN APP
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    
    try {
      await authService.resendOTP(phoneNumber, isSignup, userName, email);
      console.log('OTP resent successfully');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to resend OTP. Please try again.');
      }
    }
  };

  const clearError = () => {
    setError('');
  };

  const title = isSignup ? 'Verify Your Number' : "Verify It's You";
  const displayPhone = getDisplayPhone(phoneNumber);
  const countryCode = getCountryCode(phoneNumber);
  const subtitle = `Enter the code sent to ${countryCode} ${displayPhone}`;

  return (
    <AuthTemplate
      header={
        <AuthHeader
          title={title}
          subtitle={subtitle}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <OTPVerificationForm
        phoneNumber={displayPhone}
        countryCode={countryCode}
        isSignup={isSignup}
        onVerify={handleVerify}
        onResend={handleResend}
        isLoading={isLoading}
        error={error}
        clearError={clearError}
      />
    </AuthTemplate>
  );
};

export default OTPVerificationScreen;