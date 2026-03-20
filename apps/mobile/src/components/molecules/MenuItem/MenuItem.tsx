import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@atoms/Text';
import { Badge } from '@atoms/Badge';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';

export interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  textColor?: 'textPrimary' | 'error';
  showArrow?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  subtitle,
  badge,
  onPress,
  textColor = 'textPrimary',
  showArrow = true,
}) => (
  <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.left}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.labelWrap}>
        <Text variant="bodyLarge" color={textColor}>{label}</Text>
        {subtitle && (
          <Text variant="bodySmall" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    <View style={styles.right}>
      {badge !== undefined && (
        <Badge count={badge} variant="error" size="small" />
      )}
      {showArrow && (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18l6-6-6-6"
            stroke={colors.gray500}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { marginRight: spacing.md },
  labelWrap: { flex: 1 },
  subtitle: { marginTop: spacing.xxs },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export default MenuItem;