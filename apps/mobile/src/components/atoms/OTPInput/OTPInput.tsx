import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '@theme/colors';
import { borderRadius, spacing } from '@theme/spacing';
import { typography } from '@theme/typography';

export interface OTPInputProps extends Omit<TextInputProps, 'value'> {
  value: string;
  hasError?: boolean;
  isFocused?: boolean;
}

export const OTPInput = forwardRef<TextInput, OTPInputProps>(
  ({ value, hasError = false, isFocused = false, style, ...props }, ref) => {
    const getBorderColor = () => {
      if (hasError) return colors.error;
      if (isFocused) return colors.primary;
      if (value) return colors.border;
      return colors.border;
    };

    const getBackgroundColor = () => {
      if (hasError) return colors.errorBg;
      return colors.white;
    };

    return (
      <View
        style={[
          styles.container,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            typography.h3,
            { color: hasError ? colors.error : colors.textPrimary },
            style,
          ]}
          value={value}
          maxLength={1}
          keyboardType="number-pad"
          textAlign="center"
          selectTextOnFocus
          contextMenuHidden
          caretHidden
          {...props}
        />
      </View>
    );
  }
);

OTPInput.displayName = 'OTPInput';

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
});

export default OTPInput;
