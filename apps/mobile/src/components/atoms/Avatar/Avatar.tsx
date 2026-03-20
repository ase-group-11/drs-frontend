import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Text/Text';
import { colors } from '@theme/colors';

export interface AvatarProps {
  initials: string;
  size?: 'small' | 'medium' | 'large';
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 'medium',
  backgroundColor = colors.primary,
  style,
}) => {
  const sizeMap = { small: 32, medium: 40, large: 64 };
  const variantMap: Record<string, 'labelMedium' | 'bodyMedium' | 'h5'> = {
    small: 'labelMedium',
    medium: 'bodyMedium',
    large: 'h5',
  };
  const dim = sizeMap[size];

  return (
    <View
      style={[
        styles.avatar,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor },
        style,
      ]}
    >
      <Text variant={variantMap[size]} color="white" style={styles.initials}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center' },
  initials: { fontWeight: '600' },
});

export default Avatar;