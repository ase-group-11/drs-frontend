import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { OTPInputGroup } from '@molecules/OTPInputGroup';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import { OTP_LENGTH } from '@constants/index';
import { useOTPTimer } from '@hooks/useOTPTimer';
import Svg, { Path, Circle } from 'react-native-svg';

export interface OTPVerificationFormProps {
  phoneNumber: string;
  countryCode: string;
  isSignup?: boolean;
  onVerify: (otp: string) => void;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  onClearError?: () => void;
}

const ErrorIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={colors.error} strokeWidth="2" />
    <Path d="M12 8V12M12 16H12.01" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  phoneNumber, countryCode, isSignup = false,
  onVerify, onResend, isLoading = false, error, onClearError,
}) => {
  const [otp, setOtp] = useState('');
  const { canResend, resendLoading, resendSuccess, formattedTime, triggerResend } = useOTPTimer();

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value);
    if (error && onClearError) onClearError();
  }, [error, onClearError]);

  const handleResend = () => {
    setOtp('');
    if (onClearError) onClearError();
    triggerResend(onResend);
  };

  return (
    <View style={styles.container}>
      <OTPInputGroup value={otp} onChange={handleOtpChange} hasError={!!error} length={OTP_LENGTH} />

      {error && (
        <View style={styles.errorContainer}>
          <ErrorIcon />
          <Text variant="bodySmall" color="error" style={styles.errorText}>{error}</Text>
        </View>
      )}

      {resendSuccess && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ OTP resent successfully!</Text>
        </View>
      )}

      <View style={styles.phoneDisplayContainer}>
        <Text variant="labelMedium" color="textPrimary" style={styles.phoneLabel}>Mobile Number</Text>
        <View style={styles.phoneDisplay}>
          <Text variant="bodyMedium" color="textSecondary" style={styles.countryCode}>{countryCode}</Text>
          <Text variant="bodyMedium" color="textSecondary">{phoneNumber}</Text>
        </View>
      </View>

      <Button
        title={isSignup ? 'Verify & Create Account' : 'Verify & Log In'}
        onPress={() => { if (otp.length === OTP_LENGTH) onVerify(otp); }}
        loading={isLoading}
        disabled={otp.length !== OTP_LENGTH}
        style={styles.button}
      />

      <View style={styles.resendContainer}>
        {resendLoading ? (
          <View style={styles.resendRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodyMedium" color="textSecondary" style={{ marginLeft: 8 }}>Sending new code…</Text>
          </View>
        ) : canResend ? (
          <View style={styles.resendRow}>
            <Text variant="bodyMedium" color="textSecondary">Didn't receive code? </Text>
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <Text variant="bodyMedium" color="primary" style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resendRow}>
            <Text variant="bodyMedium" color="textSecondary">Resend OTP in </Text>
            <Text style={styles.timerText}>{formattedTime}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:            { width: '100%', paddingTop: spacing.xxl },
  errorContainer:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.lg },
  errorText:            { marginLeft: spacing.sm, flex: 1 },
  successContainer:     { backgroundColor: '#F0FDF4', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.lg, borderWidth: 1, borderColor: '#86EFAC', alignItems: 'center' },
  successText:          { color: '#166534', fontWeight: '600', fontSize: 13 },
  phoneDisplayContainer:{ marginTop: spacing.xxl },
  phoneLabel:           { marginBottom: spacing.sm },
  phoneDisplay:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  countryCode:          { marginRight: spacing.sm, paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border },
  button:               { marginTop: spacing.xxl },
  resendContainer:      { alignItems: 'center', marginTop: spacing.xxl },
  resendRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resendLink:           { fontWeight: '700', textDecorationLine: 'underline' },
  timerText:            { color: colors.primary, fontWeight: '700', fontSize: 15 },
});

export default OTPVerificationForm;