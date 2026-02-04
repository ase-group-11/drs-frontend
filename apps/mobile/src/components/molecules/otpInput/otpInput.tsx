import React from 'react';
import {View} from 'react-native';
import {TextInput} from '../../atoms/textInput';
import {otpInputStyles} from './styles';

type otpInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  errorMessage?: string;
};

function OtpInput({value, onChangeText, errorMessage}: otpInputProps) {
  return (
    <View style={otpInputStyles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        label="OTP"
        placeholder="Enter OTP"
        keyboardType="numeric"
        maxLength={6}
        errorMessage={errorMessage}
      />
    </View>
  );
}

export default OtpInput;