import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { OTPInputGroup } from '@molecules/OTPInputGroup';
import { colors } from '@theme/colors';
import { spacing, borderRadius } from '@theme/spacing';
import { OTP_RESEND_TIMEOUT, OTP_LENGTH } from '@constants/index';
import Svg, { Path, Circle } from 'react-native-svg';

export interface OTPVerificationFormProps {
  phoneNumber: string;
  countryCode: string;
  isSignup?: boolean;
  onVerify: (otp: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  error?: string;
  onClearError?: () => void;
}

const ErrorIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={colors.error} strokeWidth="2" />
    <Path
      d="M12 8V12M12 16H12.01"
      stroke={colors.error}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  phoneNumber,
  countryCode,
  isSignup = false,
  onVerify,
  onResend,
  isLoading = false,
  error,
  onClearError,
}) => {
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(OTP_RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value);
    if (error && onClearError) {
      onClearError();
    }
  }, [error, onClearError]);

  const handleVerify = () => {
    if (otp.length === OTP_LENGTH) {
      onVerify(otp);
    }
  };

  const handleResend = () => {
    if (canResend) {
      setOtp('');
      setResendTimer(OTP_RESEND_TIMEOUT);
      setCanResend(false);
      if (onClearError) onClearError();
      onResend();
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phoneNumber.length > 4 
    ? phoneNumber.slice(0, -4).replace(/./g, '*') + phoneNumber.slice(-4)
    : phoneNumber;

  const isButtonDisabled = otp.length !== OTP_LENGTH;

  return (
    <View style={styles.container}>
      <OTPInputGroup
        value={otp}
        onChange={handleOtpChange}
        hasError={!!error}
        length={OTP_LENGTH}
      />

      {error && (
        <View style={styles.errorContainer}>
          <ErrorIcon />
          <Text variant="bodySmall" color="error" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <View style={styles.phoneDisplayContainer}>
        <Text variant="labelMedium" color="textPrimary" style={styles.phoneLabel}>
          Mobile Number
        </Text>
        <View style={styles.phoneDisplay}>
          <Text variant="bodyMedium" color="textSecondary" style={styles.countryCode}>
            {countryCode}
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            {phoneNumber}
          </Text>
        </View>
      </View>

      <Button
        title={isSignup ? 'Verify & Create Account' : 'Verify & Log In'}
        onPress={handleVerify}
        loading={isLoading}
        disabled={isButtonDisabled}
        style={styles.button}
      />

      <View style={styles.resendContainer}>
        <Text variant="bodyMedium" color="textSecondary">
          Didn't receive code?{' '}
        </Text>
        {canResend ? (
          <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
            <Text variant="bodyMedium" color="primary">
              Resend OTP
            </Text>
          </TouchableOpacity>
        ) : (
          <Text variant="bodyMedium" color="textSecondary">
            Resend OTP ({formatTimer(resendTimer)})
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: spacing.xxl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  errorText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  phoneDisplayContainer: {
    marginTop: spacing.xxl,
  },
  phoneLabel: {
    marginBottom: spacing.sm,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  countryCode: {
    marginRight: spacing.sm,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  button: {
    marginTop: spacing.xxl,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
});

export default OTPVerificationForm;
