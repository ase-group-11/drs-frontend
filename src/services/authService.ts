import type {
  RegisterRequest,
  RegisterResponse,
  VerifyRegisterRequest,
  VerifyRegisterResponse,
  LoginRequest,
  LoginResponse,
  VerifyLoginRequest,
  VerifyLoginResponse,
  ApiResponse,
} from '@types/auth';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';

/**
 * API Error class
 */
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

/**
 * Make API request with error handling
 */
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

    // Network error
    if (error.message === 'Network request failed') {
      throw new ApiError(
        'Unable to connect to server. Please check your internet connection.',
        0
      );
    }

    throw new ApiError(error.message || 'Something went wrong', 500);
  }
}

/**
 * Format phone number for API
 * Combines country code and phone number
 * Example: "+353" + "892039542" = "+353892039542"
 */
export function formatPhoneForApi(countryCode: string, phoneNumber: string): string {
  // Ensure country code starts with +
  const formattedCountryCode = countryCode.startsWith('+') 
    ? countryCode 
    : `+${countryCode}`;
  
  // Remove any spaces or dashes from phone number
  const cleanedPhone = phoneNumber.replace(/[\s-]/g, '');
  
  return `${formattedCountryCode}${cleanedPhone}`;
}

/**
 * Validate phone number
 */
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

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: true }; // Email is optional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true };
}

/**
 * Validate full name
 */
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
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate OTP
 */
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

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Register new user (sends OTP)
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Verify registration OTP
   */
  async verifyRegistration(request: VerifyRegisterRequest): Promise<VerifyRegisterResponse> {
    return apiRequest<VerifyRegisterResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Login user (sends OTP)
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Verify login OTP
   */
  async verifyLogin(request: VerifyLoginRequest): Promise<VerifyLoginResponse> {
    return apiRequest<VerifyLoginResponse>('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>('/auth/health', {
      method: 'GET',
    });
  }

  /**
   * Resend OTP (calls login or register again)
   */
  async resendOTP(phoneNumber: string, isSignup: boolean, fullName?: string, email?: string): Promise<void> {
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

export const authService = new AuthService();
export default authService;
