import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { borderRadius, spacing } from '@theme/spacing';
import { typography } from '@theme/typography';

export interface InputProps extends TextInputProps {
  label?: string;
  labelSuffix?: string;
  error?: string;
  disabled?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      labelSuffix,
      error,
      disabled = false,
      leftElement,
      rightElement,
      style,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <View style={styles.container}>
        {label && (
          <View style={styles.labelContainer}>
            <Text variant="labelMedium" color="textPrimary">
              {label}
            </Text>
            {labelSuffix && (
              <Text variant="labelMedium" color="textSecondary" style={styles.labelSuffix}>
                {labelSuffix}
              </Text>
            )}
          </View>
        )}
        <View
          style={[
            styles.inputContainer,
            hasError && styles.inputError,
            disabled && styles.inputDisabled,
          ]}
        >
          {leftElement && <View style={styles.leftElement}>{leftElement}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              typography.bodyMedium,
              { color: disabled ? colors.textDisabled : colors.textPrimary },
              style,
            ]}
            placeholderTextColor={colors.textPlaceholder}
            editable={!disabled}
            {...props}
          />
          {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
        </View>
        {hasError && (
          <Text variant="caption" color="error" style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  labelSuffix: {
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  inputDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    margin: 0,
    padding: 0,
  },
  leftElement: {
    marginRight: spacing.sm,
  },
  rightElement: {
    marginLeft: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
  },
});

export default Input;
