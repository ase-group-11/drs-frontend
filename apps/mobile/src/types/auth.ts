// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/types/auth.ts
// Authentication Types - COMPLETE & READY TO USE
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  phone_number: string;
  full_name: string;
  email?: string;
  status: string;
  created_at: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// Token Response (matches backend)
// ═══════════════════════════════════════════════════════════════════════════

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Register API
// ═══════════════════════════════════════════════════════════════════════════

export interface RegisterRequest {
  phone_number: string;
  full_name: string;
  email?: string;
}

export interface RegisterResponse {
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Verify Registration API
// ═══════════════════════════════════════════════════════════════════════════

export interface VerifyRegisterRequest {
  phone_number: string;
  otp: string;
}

export interface VerifyRegisterResponse {
  user: User;
  tokens: TokenResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// Login API
// ═══════════════════════════════════════════════════════════════════════════

export interface LoginRequest {
  phone_number: string;
}

export interface LoginResponse {
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Verify Login API
// ═══════════════════════════════════════════════════════════════════════════

export interface VerifyLoginRequest {
  phone_number: string;
  otp: string;
}

export interface VerifyLoginResponse {
  user: User;
  tokens: TokenResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// Generic API Response
// ═══════════════════════════════════════════════════════════════════════════

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