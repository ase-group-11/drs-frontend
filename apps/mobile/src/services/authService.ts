// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/authService.ts
// Authentication Service - COMPLETE & READY TO USE
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RegisterRequest,
  RegisterResponse,
  VerifyRegisterRequest,
  VerifyRegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyLoginRequest,
  VerifyLoginResponse,
  User,
  TokenResponse,
} from '@types/auth';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';

// ═══════════════════════════════════════════════════════════════════════════
// Storage Keys
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA: '@auth/user_data',
};

// ═══════════════════════════════════════════════════════════════════════════
// API Error Class
// ═══════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API Request Helper
// ═══════════════════════════════════════════════════════════════════════════

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || data.detail || 'Something went wrong',
        response.status,
        data
      );
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.message === 'Network request failed') {
      throw new ApiError(
        'Unable to connect to server. Please check your internet connection.',
        0
      );
    }

    throw new ApiError(error.message || 'Something went wrong', 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Format Phone Number
// ═══════════════════════════════════════════════════════════════════════════

export function formatPhoneForApi(countryCode: string, phoneNumber: string): string {
  const formattedCountryCode = countryCode.startsWith('+') 
    ? countryCode 
    : `+${countryCode}`;
  
  const cleanedPhone = phoneNumber.replace(/[\s-]/g, '');
  
  return `${formattedCountryCode}${cleanedPhone}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

export function validatePhoneNumber(phoneNumber: string): { valid: boolean; error?: string } {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (!cleaned) {
    return { valid: false, error: 'Please enter your mobile number' };
  }
  
  if (cleaned.length < 7) {
    return { valid: false, error: 'Phone number must be at least 7 digits' };
  }
  
  if (cleaned.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: true };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true };
}

export function validateFullName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter your name' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }
  
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

export function validateOTP(otp: string, length: number = 6): { valid: boolean; error?: string } {
  if (!otp) {
    return { valid: false, error: 'Please enter the OTP' };
  }
  
  if (otp.length !== length) {
    return { valid: false, error: `OTP must be ${length} digits` };
  }
  
  if (!/^\d+$/.test(otp)) {
    return { valid: false, error: 'OTP must contain only numbers' };
  }
  
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Service Class
// ═══════════════════════════════════════════════════════════════════════════

class AuthService {
  private accessToken: string | null = null;

  constructor() {
    this.loadToken();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Token Management
  // ───────────────────────────────────────────────────────────────────────────

  private async loadToken() {
    try {
      this.accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async saveTokens(tokens: TokenResponse, user: User) {
    try {
      this.accessToken = tokens.access_token;
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw new ApiError('Failed to save authentication data', 500);
    }
  }

  async clearTokens() {
    try {
      this.accessToken = null;
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  getAuthHeader(): Record<string, string> {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // API Methods
  // ───────────────────────────────────────────────────────────────────────────

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async verifyRegistration(request: VerifyRegisterRequest): Promise<VerifyRegisterResponse> {
    const response = await apiRequest<VerifyRegisterResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // Save tokens automatically
    await this.saveTokens(response.tokens, response.user);
    
    return response;
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async verifyLogin(request: VerifyLoginRequest): Promise<VerifyLoginResponse> {
    const response = await apiRequest<VerifyLoginResponse>('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // Save tokens automatically
    await this.saveTokens(response.tokens, response.user);
    
    return response;
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  async healthCheck(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>('/auth/health', {
      method: 'GET',
    });
  }

  async resendOTP(
    phoneNumber: string,
    isSignup: boolean,
    fullName?: string,
    email?: string
  ): Promise<void> {
    if (isSignup && fullName) {
      await this.register({
        phone_number: phoneNumber,
        full_name: fullName,
        email,
      });
    } else {
      await this.login({
        phone_number: phoneNumber,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Export Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════

export const authService = new AuthService();
export default authService;