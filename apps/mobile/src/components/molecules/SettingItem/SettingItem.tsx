import React from 'react';
import { View, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@atoms/Text';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import Svg, { Path } from 'react-native-svg';

export interface SettingItemProps {
  label: string;
  subtitle?: string;
  type?: 'navigate' | 'toggle';
  value?: boolean;
  rightText?: string;
  onPress?: () => void;
  onToggle?: (val: boolean) => void;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  label,
  subtitle,
  type = 'navigate',
  value = false,
  rightText,
  onPress,
  onToggle,
}) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    activeOpacity={type === 'toggle' ? 1 : 0.7}
  >
    <View style={styles.left}>
      <Text variant="bodyLarge" color="textPrimary">{label}</Text>
      {subtitle ? (
        <Text variant="bodySmall" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>

    {type === 'toggle' ? (
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray300, true: colors.success }}
        thumbColor={colors.white}
      />
    ) : (
      <View style={styles.right}>
        {rightText ? (
          <Text variant="bodySmall" color="textSecondary">{rightText}</Text>
        ) : null}
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18l6-6-6-6"
            stroke={colors.gray500}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    )}
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
  left: { flex: 1 },
  subtitle: { marginTop: spacing.xxs },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export default SettingItem;