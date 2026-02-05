export type sendOtpRequest = {
  mobile_number: string;
};

export type sendOtpResponse = {
  success?: boolean;
  message?: string;
};

export type verifyOtpRequest = {
  mobile_number: string;
  otp_code: string;
};

export type verifyOtpResponse = {
  success?: boolean;
  token?: string;
  message?: string;
};