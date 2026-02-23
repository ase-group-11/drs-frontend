import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthTemplate } from '@templates/AuthTemplate';
import { Text } from '@/components/atoms/Text';
import { SignupForm } from '@organisms/SignupForm';
import { authService, formatPhoneForApi, ApiError } from '@services/authService';
import { spacing } from '@theme/spacing';
import type { SignupScreenProps } from '@types/navigation';

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (
    firstName: string,
    lastName: string,
    phoneNumber: string,
    countryCode: string,
    email?: string
  ) => {
    setIsLoading(true);
    setError('');

    try {
      // Format phone number for API: +353892039542
      const formattedPhone = formatPhoneForApi(countryCode, phoneNumber);
      
      // Combine first name and last name
      const fullName = `${firstName} ${lastName}`;

      // Call register API
      await authService.register({
        phone_number: formattedPhone,
        full_name: fullName,
        email: email || undefined,
      });

      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', {
        phoneNumber: formattedPhone,
        isSignup: true,
        userName: fullName,
        email: email || undefined,
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

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <AuthTemplate
      header={
        <View style={styles.header}>
          <Text variant="brand" color="navy" style={styles.brandText}>
            DISASTER RESPONSE SYSTEM
          </Text>
          <Text variant="h2" color="textPrimary" align="center" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyMedium" color="textSecondary" align="center" style={styles.subtitle}>
            Join us to get started
          </Text>
        </View>
      }
    >
      <SignupForm
        onSubmit={handleSignup}
        onLoginPress={handleLoginPress}
        isLoading={isLoading}
        error={error}
      />
    </AuthTemplate>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  brandText: {
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
});

export default SignupScreen;
