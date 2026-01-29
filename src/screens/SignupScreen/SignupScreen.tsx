import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthTemplate } from '@templates/AuthTemplate';
import { Text } from '@atoms/Text';
import { SignupForm } from '@organisms/SignupForm';
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
      // TODO: Call API to initiate signup and send OTP
      // const response = await authService.signup({ 
      //   firstName, 
      //   lastName, 
      //   mobileNumber: phoneNumber, 
      //   countryCode,
      //   email 
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Navigate to OTP verification screen
      navigation.navigate('OTPVerification', {
        mobileNumber: phoneNumber,
        countryCode,
        isSignup: true,
        userName: `${firstName} ${lastName}`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
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
