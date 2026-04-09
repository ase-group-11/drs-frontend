import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

import { authService, ApiError } from '../authService';

const OK  = (data: object) => ({ ok: true,  status: 200, json: () => Promise.resolve(data) });
const ERR = (s: number, d: string) => ({ ok: false, status: s, json: () => Promise.resolve({ detail: d }) });

beforeEach(() => jest.clearAllMocks());

describe('authService.login', () => {
  it('POSTs to the correct login endpoint', async () => {
    mockFetch.mockResolvedValueOnce(OK({ message: 'OTP sent' }));
    await authService.login({ phone_number: '+353851234567' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });
  it('throws ApiError when phone is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce(ERR(404, 'User not found'));
    await expect(authService.login({ phone_number: '+353000000000' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authService.register', () => {
  it('POSTs to the correct register endpoint', async () => {
    mockFetch.mockResolvedValueOnce(OK({ message: 'OTP sent' }));
    await authService.register({ phone_number: '+353851234567', full_name: 'Test User' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({ method: 'POST' })
    );
  });
  it('throws ApiError when phone is already taken (409)', async () => {
    mockFetch.mockResolvedValueOnce(ERR(409, 'Phone already registered'));
    await expect(authService.register({ phone_number: '+353851234567', full_name: 'Dupe' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authService.verifyLogin', () => {
  it('returns tokens and user on success', async () => {
    mockFetch.mockResolvedValueOnce(OK({
      access_token: 'acc_123', refresh_token: 'ref_xyz',
      user: { id: 'u1', full_name: 'Jane' },
    }));
    const r = await authService.verifyLogin({ phone_number: '+353851234567', otp: '123456' });
    expect(r.tokens.access_token).toBe('acc_123');
    expect(r.user.full_name).toBe('Jane');
  });
  it('throws ApiError on invalid OTP (400)', async () => {
    mockFetch.mockResolvedValueOnce(ERR(400, 'Invalid OTP'));
    await expect(authService.verifyLogin({ phone_number: '+353851234567', otp: '000000' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authService.verifyRegistration', () => {
  it('POSTs to verify-registration and returns tokens', async () => {
    mockFetch.mockResolvedValueOnce(OK({ access_token: 'acc_new', refresh_token: 'ref_new', user: { id: 'u2', full_name: 'New User' } }));
    const r = await authService.verifyRegistration({ phone_number: '+353851111111', otp: '654321' });
    expect(r.tokens.access_token).toBe('acc_new');
  });
  it('throws ApiError on expired OTP (410)', async () => {
    mockFetch.mockResolvedValueOnce(ERR(410, 'OTP expired'));
    await expect(authService.verifyRegistration({ phone_number: '+353851111111', otp: '000000' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('authService.logout', () => {
  it('clears auth keys from AsyncStorage', async () => {
    await authService.logout();
    expect(AsyncStorage.multiRemove ?? AsyncStorage.removeItem).toHaveBeenCalled();
  });
});

describe('authService.getStoredUser', () => {
  it('returns the parsed user object', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ id: 'u1', full_name: 'Stored User' }));
    const user = await authService.getStoredUser();
    expect(user?.full_name).toBe('Stored User');
  });
  it('returns null when no user is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    expect(await authService.getStoredUser()).toBeNull();
  });
});

describe('authService.resendOTP', () => {
  it('calls the resend endpoint', async () => {
    mockFetch.mockResolvedValueOnce(OK({ message: 'OTP resent' }));
    await authService.resendOTP('+353851234567', false);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/resend'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});