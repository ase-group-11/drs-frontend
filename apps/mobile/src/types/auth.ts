export interface User {
  id: string;
  phone_number: string;
  full_name: string;
  email?: string;
  role?: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'admin' | 'responder' | 'coordinator';

export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Register API
export interface RegisterRequest {
  phone_number: string; // Format: +911234567890
  full_name: string;
  email?: string;
}

export interface RegisterResponse {
  message: string;
  success: boolean;
}

// Verify Registration API
export interface VerifyRegisterRequest {
  phone_number: string;
  otp: string;
}

export interface VerifyRegisterResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token?: string;
}

// Login API
export interface LoginRequest {
  phone_number: string; // Format: +911234567890
}

export interface LoginResponse {
  message: string;
  success: boolean;
}

// Verify Login API
export interface VerifyLoginRequest {
  phone_number: string;
  otp: string;
}

export interface VerifyLoginResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token?: string;
}

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface Country {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export interface OTPVerificationState {
  phoneNumber: string;
  isSignup: boolean;
  userName?: string;
}
