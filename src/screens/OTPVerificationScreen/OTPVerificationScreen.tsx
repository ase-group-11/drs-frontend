import React, { useState } from 'react';
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

  // Extract display phone (last digits) from full phone number
  const getDisplayPhone = (fullPhone: string): string => {
    // Remove the + and country code for display
    // +353892039542 -> show last 9 digits or so
    if (fullPhone.length > 6) {
      return fullPhone.slice(-9);
    }
    return fullPhone;
  };

  // Extract country code from full phone number
  const getCountryCode = (fullPhone: string): string => {
    // +353892039542 -> +353
    const match = fullPhone.match(/^(\+\d{1,4})/);
    return match ? match[1] : '+353';
  };

  const handleVerify = async (otp: string) => {
    setIsLoading(true);
    setError('');

    try {
      if (isSignup) {
        // Verify registration OTP
        const response = await authService.verifyRegistration({
          phone_number: phoneNumber,
          otp,
        });
        
        // TODO: Store token in secure storage
        // await SecureStore.setItemAsync('token', response.access_token);
        console.log('Registration successful:', response);
      } else {
        // Verify login OTP
        const response = await authService.verifyLogin({
          phone_number: phoneNumber,
          otp,
        });
        
        // TODO: Store token in secure storage
        // await SecureStore.setItemAsync('token', response.access_token);
        console.log('Login successful:', response);
      }

      // Navigate to Welcome screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome', params: { isNewUser: isSignup } }],
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
        onClearError={clearError}
      />
    </AuthTemplate>
  );
};

export default OTPVerificationScreen;
