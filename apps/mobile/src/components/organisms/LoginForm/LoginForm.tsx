// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/organisms/LoginForm/LoginForm.tsx
// UPDATED: Added "Login as Emergency Responder" link
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@atoms/Text';
import { Button } from '@atoms/Button';
import { PhoneInput } from '@molecules/PhoneInput';
import { spacing, borderRadius } from '@theme/spacing';
import { DEFAULT_COUNTRY } from '@constants/index';
import type { Country } from '@types/auth';

export interface LoginFormProps {
  onSubmit: (phoneNumber: string, countryCode: string) => void;
  onSignupPress: () => void;
  onResponderPress?: () => void;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit, onSignupPress, onResponderPress, isLoading = false, error,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry]         = useState<Country>(DEFAULT_COUNTRY);
  const [phoneError, setPhoneError]   = useState('');

  const validatePhone = (): boolean => {
    if (!phoneNumber.trim())     { setPhoneError('Please enter your mobile number'); return false; }
    if (phoneNumber.length < 7)  { setPhoneError('Please enter a valid mobile number'); return false; }
    setPhoneError('');
    return true;
  };

  const handleSubmit = () => { if (validatePhone()) onSubmit(phoneNumber, country.dialCode); };
  const isButtonDisabled = !phoneNumber.trim() || phoneNumber.length < 7;

  return (
    <View style={styles.container}>
      <PhoneInput
        value={phoneNumber}
        countryCode={country.dialCode}
        onChangePhone={(phone) => { setPhoneNumber(phone); if (phoneError) setPhoneError(''); }}
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

      {/* Signup link */}
      <View style={styles.signupContainer}>
        <Text variant="bodyMedium" color="textSecondary">Don't have an account? </Text>
        <TouchableOpacity onPress={onSignupPress} activeOpacity={0.7}>
          <Text variant="bodyMedium" color="primary">Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text variant="bodySmall" color="textSecondary" style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Responder login */}
      <TouchableOpacity style={styles.responderBtn} onPress={onResponderPress} activeOpacity={0.85}>
        <Text style={styles.responderBtnText}>Login as Emergency Responder</Text>
      </TouchableOpacity>
      <Text variant="bodySmall" color="textSecondary" style={styles.responderHint}>
        For authorised emergency services personnel only
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { width: '100%', paddingTop: spacing.xxxl },
  button:         { marginTop: spacing.xxl },
  signupContainer:{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xxl },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  dividerLine:    { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText:    { marginHorizontal: spacing.md },
  responderBtn:   {
    borderWidth: 1.5, borderColor: '#DC2626',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  responderBtnText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
  responderHint:    { textAlign: 'center', marginTop: spacing.sm, fontSize: 12 },
});

export default LoginForm;