import React from 'react';
import {View, Text} from 'react-native';
import {TextInput} from '../../atoms/textInput';
import {Button} from '../../atoms/button';
import {OtpInput} from '../../molecules/otpInput';
import {otpFormStyles} from './styles';

type otpFormMode = 'request' | 'verify';

type otpFormProps = {
  mode: otpFormMode;
  phoneNumber: string;
  otp: string;
  setPhoneNumber: (value: string) => void;
  setOtp: (value: string) => void;
  sendOtp?: () => void | Promise<void>;
  verifyOtp?: () => void | Promise<void>;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  errorMessage?: string;
  //statusMessage?: string;
};

function OtpForm({
  mode,
  phoneNumber,
  otp,
  setPhoneNumber,
  setOtp,
  sendOtp,
  verifyOtp,
  isSendingOtp,
  isVerifyingOtp,
  errorMessage,
//statusMessage,
}: otpFormProps) {
  const isRequestMode = mode === 'request';
  const isVerifyMode = mode === 'verify';

  return (
    <View style={otpFormStyles.container}>
      <Text style={otpFormStyles.title}>Login with OTP</Text>

      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        label="Phone number"
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        editable={isRequestMode} // read-only in verify screen
      />

      {isRequestMode && (
        <Button
          label={isSendingOtp ? 'Sending...' : 'Send OTP'}
          onPress={sendOtp || (() => {})}
          isLoading={isSendingOtp}
          disabled={!phoneNumber || isSendingOtp}
        />
      )}

      {isVerifyMode && (
        <>
          <View style={otpFormStyles.spacing} />

          <OtpInput value={otp} onChangeText={setOtp} />

          <Button
            label={isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
            onPress={verifyOtp || (() => {})}
            isLoading={isVerifyingOtp}
            disabled={!otp || isVerifyingOtp}
          />
        </>
      )}

      {errorMessage ? (
        <Text style={otpFormStyles.error}>{errorMessage}</Text>
      ) : null}

    { /* statusMessage ? <Text style={{color: 'blue', marginTop: 10}}>{statusMessage}</Text> : null */ } 
    </View>
  );
}

export default OtpForm;