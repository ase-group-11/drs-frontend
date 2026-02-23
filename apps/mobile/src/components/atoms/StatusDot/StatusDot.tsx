import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors } from '@theme/colors';

export interface StatusDotProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  color = colors.success,
  size = 8,
  style,
}) => (
  <View
    style={[
      {
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: size / 2,
      },
      style,
    ]}
  />
);

export default StatusDot;