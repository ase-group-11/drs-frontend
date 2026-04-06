// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/authService.ts
// FIXED: Auto token refresh on 401, multiRemove → individual removeItem
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

// ─── Storage Keys ─────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA:     '@auth/user_data',
  USER_ROLE:     '@auth/user_role',
};

// ─── Error class ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.data   = data;
  }
}

// ─── Raw fetch (no auth — used for login/register/refresh) ────────────────

async function rawRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers as any) },
    });
    clearTimeout(tid);
    const contentType = res.headers.get('content-type') ?? '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try { data = JSON.parse(text); } catch { data = { detail: text || 'Request failed' }; }
    }
    if (!res.ok) throw new ApiError(data?.message || data?.detail || 'Request failed', res.status, data);
    return data;
  } catch (e: any) {
    clearTimeout(tid);
    if (e.name === 'AbortError') throw new ApiError('Request timed out.', 408);
    if (e instanceof ApiError)   throw e;
    if (e.message === 'Network request failed') throw new ApiError('No internet connection.', 0);
    throw new ApiError(e.message || 'Something went wrong', 500);
  }
}

// ─── Token refresh logic ──────────────────────────────────────────────────

let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

async function _doRefresh(): Promise<string> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new ApiError('No refresh token. Please log in again.', 401);

  const data = await rawRequest<{ access_token: string }>('/auth/token/refresh', {
    method: 'POST',
    body:   JSON.stringify({ refresh_token: refreshToken }),
  });

  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  return data.access_token;
}

async function getRefreshedToken(): Promise<string> {
  if (_isRefreshing) {
    // Queue this call — resolve when the in-flight refresh completes
    return new Promise(resolve => _refreshQueue.push(resolve));
  }
  _isRefreshing = true;
  try {
    const token = await _doRefresh();
    _refreshQueue.forEach(r => r(token));
    _refreshQueue = [];
    return token;
  } catch (err) {
    _refreshQueue = [];
    // Force clear — user must log in again
    await authService.clearTokens();
    throw new ApiError('Session expired. Please log in again.', 401);
  } finally {
    _isRefreshing = false;
  }
}

// ─── Authenticated request — auto-refreshes on 401 ───────────────────────

export async function authRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const makeCall = async (token: string) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal:  controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers as any),
        },
      });
      clearTimeout(tid);
      return res;
    } catch (e: any) {
      clearTimeout(tid);
      throw e;
    }
  };

  try {
    let token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) throw new ApiError('Not authenticated. Please log in.', 401);

    let res = await makeCall(token);

    // Auto-refresh on 401 and retry once
    if (res.status === 401) {
      console.log('Access token expired — refreshing...');
      token = await getRefreshedToken();
      res   = await makeCall(token);
    }

    // Safe JSON parse — server may return plain text on errors
    const contentType = res.headers.get('content-type') ?? '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // Try parsing anyway in case content-type header is wrong
      try { data = JSON.parse(text); } catch { data = { detail: text || 'Request failed' }; }
    }

    if (!res.ok) throw new ApiError(data?.message || data?.detail || 'Request failed', res.status, data);
    return data;

  } catch (e: any) {
    if (e.name === 'AbortError') throw new ApiError('Request timed out.', 408);
    if (e instanceof ApiError)   throw e;
    if (e.message === 'Network request failed') throw new ApiError('No internet connection.', 0);
    throw new ApiError(e.message || 'Something went wrong', 500);
  }
}

// ─── Validation helpers ────────────────────────────────────────────────────

export function formatPhoneForApi(countryCode: string, phoneNumber: string): string {
  const code    = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  return `${code}${cleaned}`;
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned)            return { valid: false, error: 'Please enter your mobile number' };
  if (cleaned.length < 7)  return { valid: false, error: 'Phone number must be at least 7 digits' };
  if (cleaned.length > 15) return { valid: false, error: 'Phone number is too long' };
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: 'Please enter a valid email address' };
  return { valid: true };
}

export function validateFullName(name: string): { valid: boolean; error?: string } {
  const t = name.trim();
  if (!t)             return { valid: false, error: 'Please enter your name' };
  if (t.length < 2)   return { valid: false, error: 'Name must be at least 2 characters' };
  if (t.length > 100) return { valid: false, error: 'Name is too long' };
  if (!/^[a-zA-Z\s'-]+$/.test(t)) return { valid: false, error: 'Name contains invalid characters' };
  return { valid: true };
}

export function validateOTP(otp: string, length = 6): { valid: boolean; error?: string } {
  if (!otp)                  return { valid: false, error: 'Please enter the OTP' };
  if (otp.length !== length) return { valid: false, error: `OTP must be ${length} digits` };
  if (!/^\d+$/.test(otp))    return { valid: false, error: 'OTP must contain only numbers' };
  return { valid: true };
}

// ─── Cached unit info (cleared on logout) ─────────────────────────────────
let _cachedUnitInfo: { unitId: string | null; unitIds: string[]; unitCodes: string[] } | null = null;

// ─── AuthService ──────────────────────────────────────────────────────────

class AuthService {
  private accessToken: string | null = null;

  constructor() { this.loadToken(); }

  private async loadToken() {
    try { this.accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN); }
    catch (e) { console.error('Failed to load token:', e); }
  }

  private async saveTokens(tokens: TokenResponse, user: User) {
    if (!user?.id) {
      console.error('[Auth] saveTokens called with invalid user object:', JSON.stringify(user));
      throw new ApiError('Invalid user data received from server', 500);
    }
    this.accessToken = tokens.access_token;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,  tokens.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA,     JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE,     'citizen'); // always overwrite responder role
    console.log('[Auth] Tokens saved for user:', user.id);
  }

  // FIXED: multiRemove → individual removeItem (multiRemove not available on this RN version)
  async clearTokens() {
    try {
      this.accessToken = null;
      _cachedUnitInfo = null; // clear cached unit info on logout
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    } catch (e) { console.error('Failed to clear tokens:', e); }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  getAuthHeader(): Record<string, string> {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  }

  isAuthenticated(): boolean { return !!this.accessToken; }

  // Auth endpoints (no Bearer token needed)
  async register(req: RegisterRequest): Promise<RegisterResponse> {
    return rawRequest('/auth/register', { method: 'POST', body: JSON.stringify(req) });
  }

  async verifyRegistration(req: VerifyRegisterRequest): Promise<VerifyRegisterResponse> {
    const res = await rawRequest<VerifyRegisterResponse>('/auth/register/verify', {
      method: 'POST', body: JSON.stringify(req),
    });
    await this.saveTokens(res.tokens, res.user);
    return res;
  }

  async login(req: LoginRequest): Promise<LoginResponse> {
    return rawRequest('/auth/login', { method: 'POST', body: JSON.stringify(req) });
  }

  async verifyLogin(req: VerifyLoginRequest): Promise<VerifyLoginResponse> {
    const res = await rawRequest<VerifyLoginResponse>('/auth/login/verify', {
      method: 'POST', body: JSON.stringify(req),
    });
    await this.saveTokens(res.tokens, res.user);
    return res;
  }

  async logout(): Promise<void> { await this.clearTokens(); }

  async healthCheck(): Promise<{ status: string }> {
    return rawRequest('/auth/health', { method: 'GET' });
  }

  async resendOTP(phone: string, isSignup: boolean, fullName?: string, email?: string): Promise<void> {
    if (isSignup && fullName) await this.register({ phone_number: phone, full_name: fullName, email });
    else                       await this.login({ phone_number: phone });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────

export const authService = new AuthService();
export default authService;

// ─── Helper: Get responder unit info via /users/{user_id} ─────────────────
// Returns { unitId, unitIds, unitCodes } or null if no unit assigned.
// Caches the result for the session to avoid repeated calls.

export async function getUserUnitInfo(forceRefresh = false): Promise<{
  unitId: string | null;
  unitIds: string[];
  unitCodes: string[];
}> {
  if (_cachedUnitInfo && !forceRefresh) return _cachedUnitInfo;

  const user = await authService.getStoredUser();
  if (!user?.id) return { unitId: null, unitIds: [], unitCodes: [] };

  try {
    const data = await authRequest<any>(`/users/${user.id}`);
    const unitIds: string[] = data?.unit_ids ?? [];
    const unitCodes: string[] = data?.unit_codes ?? [];
    const unitId = unitIds.length > 0 ? unitIds[0] : null;
    _cachedUnitInfo = { unitId, unitIds, unitCodes };
    return _cachedUnitInfo;
  } catch (e: any) {
    console.warn('[getUserUnitInfo] Failed to fetch user unit info:', e.message);
    return { unitId: null, unitIds: [], unitCodes: [] };
  }
}

export function clearCachedUnitInfo() {
  _cachedUnitInfo = null;
}