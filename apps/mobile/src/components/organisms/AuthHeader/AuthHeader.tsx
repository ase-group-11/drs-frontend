import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Logo } from '@atoms/Logo';
import { Text } from '@/components/atoms/Text';
import { spacing } from '@theme/spacing';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  logoSize?: number;
  showLogo?: boolean;
  onBack?: () => void;  // shows back arrow in top-left when provided
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  logoSize = 80,
  showLogo = true,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1F2937"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      )}
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
  backBtn: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    padding: spacing.sm,
    zIndex: 10,
  },
});

export default AuthHeader;