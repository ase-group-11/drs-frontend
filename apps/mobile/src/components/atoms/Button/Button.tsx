import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { borderRadius, spacing } from '@theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) {
      switch (variant) {
        case 'primary':
          return colors.gray200;
        case 'secondary':
          return colors.gray100;
        case 'outline':
        case 'ghost':
        case 'link':
          return colors.transparent;
        default:
          return colors.gray200;
      }
    }

    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.gray100;
      case 'outline':
      case 'ghost':
      case 'link':
        return colors.transparent;
      default:
        return colors.primary;
    }
  };

  const getTextColor = (): keyof typeof colors => {
    if (isDisabled) {
      return 'textDisabled';
    }

    switch (variant) {
      case 'primary':
        return 'white';
      case 'secondary':
        return 'textPrimary';
      case 'outline':
      case 'ghost':
        return 'primary';
      case 'link':
        return 'primary';
      default:
        return 'white';
    }
  };

  const getBorderStyle = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 1,
        borderColor: isDisabled ? colors.gray300 : colors.primary,
      };
    }
    return {};
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        };
      case 'medium':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
        };
      default:
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
        };
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'buttonSmall' as const;
      case 'medium':
        return 'buttonMedium' as const;
      case 'large':
        return 'buttonLarge' as const;
      default:
        return 'buttonMedium' as const;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
        },
        getBorderStyle(),
        getSizeStyle(),
        fullWidth && styles.fullWidth,
        variant === 'link' && styles.linkButton,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text variant={getTextVariant()} color={getTextColor()}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  linkButton: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});

export default Button;
