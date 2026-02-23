import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Text/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

export interface BadgeProps {
  count?: number;
  text?: string;
  variant?: 'primary' | 'error' | 'success' | 'warning';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  text,
  variant = 'primary',
  size = 'medium',
  style,
}) => {
  const bgColor: Record<string, string> = {
    primary: colors.primary,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor[variant] },
        size === 'small' && styles.small,
        style,
      ]}
    >
      <Text
        variant={size === 'small' ? 'labelSmall' : 'labelMedium'}
        color="white"
        style={styles.text}
      >
        {text ?? count}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  small: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  text: {
    fontWeight: '700',
  },
});

export default Badge;