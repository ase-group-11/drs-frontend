// src/screens/auth/requestOtpScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {authStackParamList} from '../../navigation/types';
import {authRoutes} from '../../config/routes';
import {useOtp} from '../../hooks/useOtp';
import {OtpForm} from '../../components/organisms/otpForm';
//const [statusMessage, setStatusMessage] = useState('');

type props = NativeStackScreenProps<
  authStackParamList,
  (typeof authRoutes)['requestOtp']
>;

function RequestOtpScreen({navigation}: props) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(''); // not used on this screen, but required by OtpForm props

  const {sendOtp, isSendingOtp, isVerifyingOtp, errorMessage} = useOtp();

 const handleSendOtpPress = async () => {
  //setStatusMessage(`Sending OTP to ${phoneNumber}...`);
  console.log(`Sending OTP to ${phoneNumber}...`);
    
  const success = await sendOtp(phoneNumber);

  if (success) {
    navigation.navigate(authRoutes.verifyOtp, {phoneNumber});
  } //else {
   // setStatusMessage('Phone number already exists or sending failed.');
//  }
};
  return (
    <View style={styles.container}>
      <OtpForm
        mode="request"
        phoneNumber={phoneNumber}
        otp={otp}
        setPhoneNumber={setPhoneNumber}
        setOtp={setOtp}
        sendOtp={handleSendOtpPress}
        isSendingOtp={isSendingOtp}
        isVerifyingOtp={isVerifyingOtp}
        errorMessage={errorMessage}
      //  statusMessage={statusMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default RequestOtpScreen;