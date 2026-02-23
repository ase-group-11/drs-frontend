import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Text } from '@/components/atoms/Text';
import { colors } from '@theme/colors';
import { borderRadius, spacing } from '@theme/spacing';
import { typography } from '@theme/typography';
import { COUNTRIES } from '@constants/index';
import type { Country } from '@types/auth';
import Svg, { Path } from 'react-native-svg';

export interface PhoneInputProps {
  value: string;
  countryCode: string;
  onChangePhone: (phone: string) => void;
  onChangeCountry: (country: Country) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const ChevronDown: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = colors.textSecondary,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  countryCode,
  onChangePhone,
  onChangeCountry,
  label = 'Mobile Number',
  error,
  disabled = false,
  placeholder = '123 456 789',
}) => {
  const [isPickerVisible, setPickerVisible] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.dialCode === countryCode) || COUNTRIES[0];

  const handleCountrySelect = (country: Country) => {
    onChangeCountry(country);
    setPickerVisible(false);
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangePhone(formatted);
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(item)}
      activeOpacity={0.7}
    >
      <Text variant="bodyLarge" style={styles.countryFlag}>
        {item.flag}
      </Text>
      <Text variant="bodyMedium" color="textPrimary" style={styles.countryName}>
        {item.name}
      </Text>
      <Text variant="bodyMedium" color="textSecondary">
        {item.dialCode}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="labelMedium" color="textPrimary" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
      >
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => !disabled && setPickerVisible(true)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text variant="bodyMedium" color={disabled ? 'textDisabled' : 'textPrimary'}>
            {selectedCountry.dialCode}
          </Text>
          <ChevronDown color={disabled ? colors.textDisabled : colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.separator} />
        <TextInput
          value={value}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          keyboardType="phone-pad"
          editable={!disabled}
          style={[
            styles.phoneInput,
            typography.bodyMedium,
            { color: disabled ? colors.textDisabled : colors.textPrimary },
          ]}
        />
      </View>
      {error && (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      )}

      <Modal
        visible={isPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h4" color="textPrimary">
              Select Country
            </Text>
            <TouchableOpacity
              onPress={() => setPickerVisible(false)}
              style={styles.closeButton}
            >
              <Text variant="bodyLarge" color="primary">
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            contentContainerStyle={styles.listContent}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  inputDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    margin: 0,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.sm,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  countryName: {
    flex: 1,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.lg + 40,
  },
});

export default PhoneInput;
