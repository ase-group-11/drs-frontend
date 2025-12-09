import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity} from 'react-native';
import {buttonStyles} from './styles';

type buttonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

function Button({label, onPress, disabled, isLoading}: buttonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[buttonStyles.container, isDisabled && buttonStyles.disabled]}
      onPress={onPress}
      disabled={isDisabled}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Text style={buttonStyles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export default Button;