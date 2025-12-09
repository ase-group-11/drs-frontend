import React from 'react';
import {TextInput as RNTextInput, View, Text} from 'react-native';
import {textInputStyles} from './styles';

type textInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  secureTextEntry?: boolean;
  label?: string;
  errorMessage?: string;
  maxLength?: number;
  editable?: boolean;
};

function TextInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  label,
  errorMessage,
  maxLength,
  editable = true,
}: textInputProps) {
  return (
    <View style={textInputStyles.container}>
      {label ? <Text style={textInputStyles.label}>{label}</Text> : null}
      <RNTextInput
        style={textInputStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={editable}
      />
      {errorMessage ? (
        <Text style={textInputStyles.error}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

export default TextInput;
