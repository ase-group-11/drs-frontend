import React, { useState } from 'react';
import { AuthTemplate } from '@templates/AuthTemplate';
import { AuthHeader } from '@organisms/AuthHeader';
import { OTPVerificationForm } from '@organisms/OTPVerificationForm';
import type { OTPVerificationScreenProps } from '@types/navigation';

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { mobileNumber, countryCode, isSignup, userName } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (otp: string) => {
    setIsLoading(true);
    setError('');

    try {
      // TODO: Call API to verify OTP
      // const response = await authService.verifyOTP({ mobileNumber, countryCode, otpCode: otp });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate OTP validation - for demo purposes
      // In production, this would be validated by the backend
      if (otp === '123456') {
        // Navigate to Welcome screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome', params: { isNewUser: isSignup } }],
        });
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      // TODO: Call API to resend OTP
      // await authService.resendOTP({ mobileNumber, countryCode });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Show success message (could use a toast)
      console.log('OTP resent successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const clearError = () => {
    setError('');
  };

  const title = isSignup ? 'Verify Your Number' : "Verify It's You";
  const subtitle = `Enter the code sent to ${countryCode} ${mobileNumber}`;

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
        phoneNumber={mobileNumber}
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
