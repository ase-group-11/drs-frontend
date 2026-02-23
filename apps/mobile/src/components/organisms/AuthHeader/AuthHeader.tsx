import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Logo } from '@atoms/Logo';
import { Text } from '@/components/atoms/Text';
import { spacing } from '@theme/spacing';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  logoSize?: number;
  showLogo?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  logoSize = 80,
  showLogo = true,
}) => {
  return (
    <View style={styles.container}>
      {showLogo && <Logo size={logoSize} />}
      <Text variant="brand" color="navy" style={[styles.brandText, !showLogo && styles.brandTextNoLogo]}>
        DISASTER RESPONSE SYSTEM
      </Text>
      <Text variant="h2" color="textPrimary" align="center" style={styles.title}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodyMedium" color="textSecondary" align="center" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  brandText: {
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  brandTextNoLogo: {
    marginTop: 0,
  },
  title: {
    marginTop: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
});

export default AuthHeader;
