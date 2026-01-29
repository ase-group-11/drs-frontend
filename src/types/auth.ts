export interface User {
  id: string;
  mobileNumber: string;
  countryCode: string;
  name?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'CITIZEN' | 'EMERGENCY_RESPONDER' | 'COORDINATOR' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'INACTIVE';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  mobileNumber: string;
  countryCode: string;
}

export interface LoginResponse {
  message: string;
  otpSent: boolean;
  expiresIn: number;
}

export interface VerifyOTPRequest {
  mobileNumber: string;
  countryCode: string;
  otpCode: string;
}

export interface VerifyOTPResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  countryCode: string;
  email?: string;
  role?: UserRole;
}

export interface SignupResponse {
  message: string;
  otpSent: boolean;
  expiresIn: number;
}

export interface ResendOTPRequest {
  mobileNumber: string;
  countryCode: string;
}

export interface ResendOTPResponse {
  message: string;
  expiresIn: number;
}

export interface Country {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

export interface OTPVerificationState {
  mobileNumber: string;
  countryCode: string;
  isSignup: boolean;
  userName?: string;
}
