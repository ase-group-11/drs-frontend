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
  salutation?: string;
  firstName: string;
  lastName: string;
}

export const requestSignupOTP = async (data: SignupData): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.REGISTER, {
      phone_number: data.phoneNumber,
      password: data.password,
      full_name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      role: data.role,
      department: data.department,
      employee_id: `EMP${Date.now().toString().slice(-6)}`,
    });
    return { success: true, message: response.data.message || 'OTP sent successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.detail || 'Failed to send OTP. Please try again.' };
  }
};

export const verifySignupOTP = async (data: { mobileNumber: string; otpCode: string }): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.REGISTER_VERIFY, {
      phone_number: data.mobileNumber,
      otp: data.otpCode,
    });

    const teamMember = response.data.team_member;
    const tokens = response.data.tokens;

    const userData: User = {
      userId: teamMember?.id || response.data.id,
      phoneNumber: teamMember?.phone_number || response.data.phone_number,
      fullName: teamMember?.full_name || response.data.full_name,
      email: teamMember?.email || response.data.email,
      role: teamMember?.role || response.data.role,
      department: teamMember?.department || response.data.department,
      employeeId: teamMember?.employee_id || response.data.employee_id,
      isVerified: true,
      createdAt: teamMember?.created_at || response.data.created_at,
    };

    return {
      success: true,
      message: 'Account verified successfully',
      data: { user: userData, token: tokens?.access_token, refreshToken: tokens?.refresh_token },
    };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.detail || 'Invalid OTP. Please try again.' };
  }
};

export const login = async (email: string, password: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.LOGIN, { email, password });

    // New OTP flow — 200 with login_token but no access tokens yet
    if (response.data.login_token) {
      return {
        success: true,
        message: response.data.message,
        data: { otpPending: true, loginToken: response.data.login_token },
      };
    }

    // Legacy direct-login fallback
    const teamMember = response.data.team_member;
    const tokens = response.data.tokens;

    const userData: User = {
      userId: teamMember.id,
      phoneNumber: teamMember.phone_number,
      fullName: teamMember.full_name,
      email: teamMember.email,
      role: teamMember.role,
      department: teamMember.department,
      employeeId: teamMember.employee_id,
      isVerified: true,
      createdAt: teamMember.created_at,
    };

    return {
      success: true,
      message: 'Login successful',
      data: { user: userData, token: tokens.access_token, refreshToken: tokens.refresh_token },
    };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.detail || 'Login failed. Please check your credentials.' };
  }
};

export const verifyLoginOTP = async (data: { loginToken: string; otpCode: string }): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.EMERGENCY_TEAM.LOGIN_VERIFY, {
      login_token: data.loginToken,
      otp: data.otpCode,
    });

    const teamMember = response.data.team_member;
    const tokens = response.data.tokens;

    const userData: User = {
      userId: teamMember?.id || response.data.id,
      phoneNumber: teamMember?.phone_number || response.data.phone_number,
      fullName: teamMember?.full_name || response.data.full_name,
      email: teamMember?.email || response.data.email,
      role: teamMember?.role || response.data.role,
      department: teamMember?.department || response.data.department,
      employeeId: teamMember?.employee_id || response.data.employee_id,
      isVerified: true,
      createdAt: teamMember?.created_at || response.data.created_at,
    };

    return {
      success: true,
      message: 'Login verified successfully',
      data: { user: userData, token: tokens?.access_token, refreshToken: tokens?.refresh_token },
    };
  } catch (error: any) {
    const detail = error.response?.data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d.msg).join(', ')
      : typeof detail === 'string' ? detail : 'Invalid OTP. Please try again.';
    return { success: false, message: msg };
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
      { old_password: data.oldPassword, new_password: data.newPassword }
    );
    return { success: true, message: response.data.message || 'Password changed successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.detail || 'Failed to change password.' };
  }
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};