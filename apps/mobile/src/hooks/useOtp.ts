import {useCallback, useState} from 'react';
import {normalizePhoneNumber, isValidOtp} from '../utils';
import {
  sendOtp as sendOtpService,
  verifyOtp as verifyOtpService,
} from '../services/auth';
import {
  sendOtpRequest,
  verifyOtpRequest,
  sendOtpResponse,
  verifyOtpResponse,
} from '../types';

type otpState = {
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  errorMessage?: string;
};

type useOtpReturn = otpState & {
  sendOtp: (phoneNumber: string) => Promise<boolean>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<boolean>;
};

export function useOtp(): useOtpReturn {
  const [state, setState] = useState<otpState>({
    isSendingOtp: false,
    isVerifyingOtp: false,
  });

  const sendOtp = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber.trim());

    if (normalizedPhoneNumber === "INVALID_FORMAT") {
  setState(prev => ({
    ...prev,
    errorMessage: 'Please enter a valid 10-digit phone number.',
  }));
  return false;
}

    const payload: sendOtpRequest = {mobile_number: normalizedPhoneNumber};
    console.log('sendOtp payload:', payload);

    setState(prev => ({
      ...prev,
      isSendingOtp: true,
      errorMessage: undefined,
    }));

    const {data, error} = await sendOtpService(payload);

    const success = !!data?.success && !error;

    setState(prev => ({
      ...prev,
      isSendingOtp: false,
      errorMessage:
        success ? undefined : error?.message ?? data?.message ?? 'Failed to send OTP.',
    }));

    return success;
  }, []);

  const verifyOtp = useCallback(
    async (phoneNumber: string, otp: string): Promise<boolean> => {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber.trim());

      if (normalizedPhoneNumber === "INVALID_FORMAT") {
  setState(prev => ({
    ...prev,
    errorMessage: 'Please enter a valid 10-digit phone number.',
  }));
  return false;
}

      if (!isValidOtp(otp)) {
        setState(prev => ({
          ...prev,
          errorMessage: 'Please enter a valid OTP.',
        }));
        return false;
      }

      const payload: verifyOtpRequest = {
        mobile_number:normalizedPhoneNumber,
        otp_code: otp.trim(),
      };

      setState(prev => ({
        ...prev,
        isVerifyingOtp: true,
        errorMessage: undefined,
      }));

      const {data, error} = await verifyOtpService(payload);

      const success = !!data?.success && !error;

      setState(prev => ({
        ...prev,
        isVerifyingOtp: false,
        errorMessage:
          success ? undefined : error?.message ?? data?.message ?? 'Failed to verify OTP.',
      }));

      return success;
    },
    [],
  );

  return {
    ...state,
    sendOtp,
    verifyOtp,
  };
}
