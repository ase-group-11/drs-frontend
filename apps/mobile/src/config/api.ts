export const apiBaseUrl = 'http://localhost:8000/api/v1';

export const apiTimeoutMs = 10000;

export const apiEndpoints = {
  sendOtp: '/auth/signup/request-otp',
  verifyOtp: '/auth/signup/verify'
};