import {apiClient} from '../api';
import {apiEndpoints} from '../../config/api';
import {
  sendOtpRequest,
  sendOtpResponse,
  verifyOtpRequest,
  verifyOtpResponse,
  apiResponse,
} from '../../types';

export async function sendOtp(payload: sendOtpRequest): Promise<apiResponse<sendOtpResponse>> {
  try {
    const response = await apiClient.post(apiEndpoints.sendOtp, payload);
    return {
      data: {
        success: true,
        message: response.data?.message ?? 'OTP sent successfully',
      },
    };
  } catch (error: any) {
    return {
      data: {
        success: false,
        message: error?.response?.data?.detail ?? 'Failed to send OTP',
      },
      error: {
        message: error?.response?.data?.detail ?? error?.message ?? 'Failed to send OTP',
        statusCode: error?.response?.status,
        details: error?.response?.data,
      },
    };
  }
}

export async function verifyOtp(payload: verifyOtpRequest): Promise<apiResponse<verifyOtpResponse>> {
  try {
    const response = await apiClient.post(apiEndpoints.verifyOtp, payload);
    return {
      data: {
        success: true,
        message: response.data?.message ?? 'OTP verified successfully',
      },
    };
  } catch (error: any) {
    return {
      data: {
        success: false,
        message: error?.response?.data?.detail ?? 'Failed to verify OTP',
      },
      error: {
        message: error?.response?.data?.detail ?? error?.message ?? 'Failed to verify OTP',
        statusCode: error?.response?.status,
        details: error?.response?.data,
      },
    };
  }
}