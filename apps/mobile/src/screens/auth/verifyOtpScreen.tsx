import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {authStackParamList} from '../../navigation/types';
import {authRoutes} from '../../config/routes';
import {useOtp} from '../../hooks/useOtp';
import {OtpForm} from '../../components/organisms/otpForm';
import { Alert } from 'react-native';

type props = NativeStackScreenProps<
  authStackParamList,
  (typeof authRoutes)['verifyOtp']
>;

function VerifyOtpScreen({route}: props) {
  const initialPhoneNumber = route.params?.phoneNumber ?? '';

  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState('');

  const {sendOtp, verifyOtp, isSendingOtp, isVerifyingOtp, errorMessage} =
    useOtp();

  useEffect(() => {
    if (route.params?.phoneNumber) {
      setPhoneNumber(route.params.phoneNumber);
    }
  }, [route.params?.phoneNumber]);

  const handleVerifyOtpPress = async () => {
  const success = await verifyOtp(phoneNumber, otp);

  if (success) {
    console.log('OTP verified successfully');
    Alert.alert('Success', 'OTP verified successfully', [{ text: 'OK' }]);
  } else {
    console.log('OTP verification failed');
    Alert.alert('Error', 'Invalid or expired OTP', [{ text: 'OK' }]);
  }
};

  const handleResendOtpPress = async () => {
    await sendOtp(phoneNumber);
  };

  return (
    <View style={styles.container}>
      <OtpForm
        mode="verify"
        phoneNumber={phoneNumber}
        otp={otp}
        setPhoneNumber={setPhoneNumber}
        setOtp={setOtp}
        sendOtp={handleResendOtpPress} // optional, for "Resend OTP" later
        verifyOtp={handleVerifyOtpPress}
        isSendingOtp={isSendingOtp}
        isVerifyingOtp={isVerifyingOtp}
        errorMessage={errorMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default VerifyOtpScreen;