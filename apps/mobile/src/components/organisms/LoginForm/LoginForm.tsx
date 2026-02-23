import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { PhoneInput } from '@molecules/PhoneInput';
import { spacing } from '@theme/spacing';
import { DEFAULT_COUNTRY } from '@constants/index';
import type { Country } from '@types/auth';

export interface LoginFormProps {
  onSubmit: (phoneNumber: string, countryCode: string) => void;
  onSignupPress: () => void;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSignupPress,
  isLoading = false,
  error,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (): boolean => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter your mobile number');
      return false;
    }
    if (phoneNumber.length < 7) {
      setPhoneError('Please enter a valid mobile number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = () => {
    if (validatePhone()) {
      onSubmit(phoneNumber, country.dialCode);
    }
  };

  const isButtonDisabled = !phoneNumber.trim() || phoneNumber.length < 7;

  return (
    <View style={styles.container}>
      <PhoneInput
        value={phoneNumber}
        countryCode={country.dialCode}
        onChangePhone={(phone) => {
          setPhoneNumber(phone);
          if (phoneError) setPhoneError('');
        }}
        onChangeCountry={setCountry}
        error={phoneError || error}
      />

      <Button
        title="Continue"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isButtonDisabled}
        style={styles.button}
      />

      <View style={styles.signupContainer}>
        <Text variant="bodyMedium" color="textSecondary">
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity onPress={onSignupPress} activeOpacity={0.7}>
          <Text variant="bodyMedium" color="primary">
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: spacing.xxxl,
  },
  button: {
    marginTop: spacing.xxl,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
});

export default LoginForm;
