import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  ResendOTPRequest,
  ResendOTPResponse,
} from '@types/auth';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';

// Simulated delay for mock responses
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Authentication Service
 * Replace mock implementations with actual API calls
 */
class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Request login OTP
   */
  async requestLogin(request: LoginRequest): Promise<LoginResponse> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${this.baseUrl}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // return response.json();

    // Mock implementation
    await delay(1500);
    
    // Simulate user not found
    // throw new Error('User not found. Please sign up first.');
    
    return {
      message: 'OTP sent successfully',
      otpSent: true,
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Request signup OTP
   */
  async signup(request: SignupRequest): Promise<SignupResponse> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${this.baseUrl}/auth/signup`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // return response.json();

    // Mock implementation
    await delay(1500);
    
    // Simulate phone already registered
    // throw new Error('Phone number already registered. Please log in.');
    
    return {
      message: 'OTP sent successfully',
      otpSent: true,
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${this.baseUrl}/auth/verify-otp`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // return response.json();

    // Mock implementation
    await delay(1500);
    
    // Simulate invalid OTP
    if (request.otpCode !== '123456') {
      throw new Error('Invalid OTP. Please try again.');
    }
    
    return {
      user: {
        id: 'user-123',
        mobileNumber: request.mobileNumber,
        countryCode: request.countryCode,
        role: 'CITIZEN',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(request: ResendOTPRequest): Promise<ResendOTPResponse> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${this.baseUrl}/auth/resend-otp`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(request),
    // });
    // return response.json();

    // Mock implementation
    await delay(500);
    
    return {
      message: 'OTP resent successfully',
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // TODO: Clear tokens from secure storage
    // TODO: Call logout API endpoint
    await delay(300);
  }
}

export const authService = new AuthService();
export default authService;
