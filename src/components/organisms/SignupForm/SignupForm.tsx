import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { Input } from '@atoms/Input';
import { PhoneInput } from '@molecules/PhoneInput';
import { spacing } from '@theme/spacing';
import { DEFAULT_COUNTRY } from '@constants/index';
import type { Country } from '@types/auth';

export interface SignupFormProps {
  onSubmit: (firstName: string, lastName: string, phoneNumber: string, countryCode: string, email?: string) => void;
  onLoginPress: () => void;
  isLoading?: boolean;
  error?: string;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  onLoginPress,
  isLoading = false,
  error,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!firstName.trim()) {
      setFirstNameError('Please enter your first name');
      isValid = false;
    } else if (firstName.trim().length < 2) {
      setFirstNameError('First name must be at least 2 characters');
      isValid = false;
    } else {
      setFirstNameError('');
    }

    if (!lastName.trim()) {
      setLastNameError('Please enter your last name');
      isValid = false;
    } else if (lastName.trim().length < 2) {
      setLastNameError('Last name must be at least 2 characters');
      isValid = false;
    } else {
      setLastNameError('');
    }

    if (!phoneNumber.trim()) {
      setPhoneError('Please enter your mobile number');
      isValid = false;
    } else if (phoneNumber.length < 7) {
      setPhoneError('Please enter a valid mobile number');
      isValid = false;
    } else {
      setPhoneError('');
    }

    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(firstName.trim(), lastName.trim(), phoneNumber, country.dialCode, email.trim() || undefined);
    }
  };

  const isButtonDisabled = !firstName.trim() || !lastName.trim() || !phoneNumber.trim() || phoneNumber.length < 7;

  return (
    <View style={styles.container}>
      <Input
        label="First Name"
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (firstNameError) setFirstNameError('');
        }}
        placeholder="Enter your first name"
        error={firstNameError}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <View style={styles.inputSpacing}>
        <Input
          label="Last Name"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            if (lastNameError) setLastNameError('');
          }}
          placeholder="Enter your last name"
          error={lastNameError}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputSpacing}>
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
      </View>

      <View style={styles.inputSpacing}>
        <Input
          label="Email"
          labelSuffix="(Optional)"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError('');
          }}
          placeholder="example@email.com"
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button
        title="Continue"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isButtonDisabled}
        style={styles.button}
      />

      <View style={styles.loginContainer}>
        <Text variant="bodyMedium" color="textSecondary">
          Already have an account?
        </Text>
        <TouchableOpacity onPress={onLoginPress} activeOpacity={0.7}>
          <Text variant="bodyMedium" color="primary">
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: spacing.xxl,
  },
  inputSpacing: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.xxl,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
});

export default SignupForm;
