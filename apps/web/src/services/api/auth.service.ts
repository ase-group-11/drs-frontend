// File: /web/src/services/api/auth.service.ts
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type { User, ApiResponse } from '../../types';

interface SignupData {
  phoneNumber: string;
  password: string;
  fullName?: string;
  email: string;
  role: string;
  department: string;
  salutation: string;
  firstName: string;
  lastName: string;
}

export const requestSignupOTP = async (data: SignupData): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.REGISTER, {
      phone_number: data.phoneNumber,
      password: data.password,
      full_name: `${data.salutation} ${data.firstName} ${data.lastName}`,
      email: data.email,
      role: data.role,
      department: data.department,
      employee_id: `EMP${Date.now().toString().slice(-6)}`,
    });

    return {
      success: true,
      message: response.data.message || 'OTP sent successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.error('Signup OTP error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to send OTP. Please try again.',
    };
  }
};

export const verifySignupOTP = async (data: {
  mobileNumber: string;
  otpCode: string;
}): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.REGISTER_VERIFY, {
      phone_number: data.mobileNumber,
      otp: data.otpCode,
    });

    const userData: User = {
      userId: response.data.team_member_id || response.data.id,
      phoneNumber: response.data.phone_number,
      fullName: response.data.full_name,
      email: response.data.email,
      role: response.data.role,
      department: response.data.department,
      employeeId: response.data.employee_id,
      isVerified: true,
      createdAt: response.data.created_at,
    };

    return {
      success: true,
      message: 'Account verified successfully',
      data: {
        user: userData,
        token: response.data.access_token || 'mock-jwt-token',
      },
    };
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Invalid OTP. Please try again.',
    };
  }
};

export const login = async (email: string, password: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.LOGIN, {
      email: email,
      password: password,
    });

    const userData: User = {
      userId: response.data.team_member_id || response.data.id,
      phoneNumber: response.data.phone_number,
      fullName: response.data.full_name,
      email: response.data.email,
      role: response.data.role,
      department: response.data.department,
      employeeId: response.data.employee_id,
      isVerified: true,
      createdAt: response.data.created_at,
    };

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token: response.data.access_token || 'mock-jwt-token',
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Login failed. Please check your credentials.',
    };
  }
};

export const changePassword = async (data: {
  teamMemberId: string;
  oldPassword: string;
  newPassword: string;
}): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(
      `${API_ENDPOINTS.EMERGENCY_TEAM.CHANGE_PASSWORD}?team_member_id=${data.teamMemberId}`,
      {
        old_password: data.oldPassword,
        new_password: data.newPassword,
      }
    );

    return {
      success: true,
      message: response.data.message || 'Password changed successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to change password.',
    };
  }
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};