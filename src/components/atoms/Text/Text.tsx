import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { typography, TypographyKeys } from '@theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyKeys;
  color?: keyof typeof colors;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'bodyMedium',
  color = 'textPrimary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  return (
    <RNText
      style={[
        typography[variant],
        {
          color: colors[color],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default Text;
