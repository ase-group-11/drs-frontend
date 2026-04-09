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
  const { phoneNumber, countryCode: paramCountryCode, isSignup, userName, email } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Use country code passed from login/signup screen directly (no regex splitting needed)
  // Falls back to extracting from E.164 if not provided
  const resolveDisplayParts = (fullPhone: string, passedCode?: string) => {
    if (passedCode) {
      const cleanCode = passedCode.startsWith('+') ? passedCode : `+${passedCode}`;
      const localNum  = fullPhone.startsWith(cleanCode)
        ? fullPhone.slice(cleanCode.length)
        : fullPhone;
      return { code: cleanCode, local: localNum };
    }
    // Fallback: try common codes (+1, +44, +353, +91, etc.) longest-first
    const knownCodes = ['+353', '+358', '+420', '+421', '+961', '+44', '+91', '+1'];
    for (const code of knownCodes) {
      if (fullPhone.startsWith(code)) {
        return { code, local: fullPhone.slice(code.length) };
      }
    }
    // Last resort: match +XX or +XXX
    const match = fullPhone.match(/^(\+\d{1,3})(\d+)$/);
    return match
      ? { code: match[1], local: match[2] }
      : { code: '+353', local: fullPhone };
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

  const handleResend = async (): Promise<void> => {
    setError('');
    await authService.resendOTP(phoneNumber, isSignup, userName, email);
  };

  const clearError = () => {
    setError('');
  };

  const { code: countryCode, local: displayPhone } = resolveDisplayParts(phoneNumber, paramCountryCode);
  const title    = isSignup ? 'Verify Your Number' : "Verify It's You";
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