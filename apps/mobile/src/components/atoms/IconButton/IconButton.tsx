import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { spacing } from '@theme/spacing';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  disabled = false,
  style,
}) => {
  const padMap = { small: spacing.xs, medium: spacing.sm, large: spacing.md };

  return (
    <TouchableOpacity
      style={[styles.btn, { padding: padMap[size] }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { justifyContent: 'center', alignItems: 'center' },
});

export default IconButton;