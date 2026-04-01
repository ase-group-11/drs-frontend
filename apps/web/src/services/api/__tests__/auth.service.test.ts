/**
 * TDD Tests — auth.service.ts
 *
 * Real API endpoints (from OpenAPI spec):
 *   POST /emergency-team/register           → requestSignupOTP
 *   POST /emergency-team/register/verify    → verifySignupOTP
 *   POST /emergency-team/login              → login
 *   POST /emergency-team/change-password    → changePassword
 *   (client-side only)                      → logout
 *
 * Run: npm test -- --watchAll=false --testPathPattern="auth.service"
 */

import {
  login,
  requestSignupOTP,
  verifySignupOTP,
  changePassword,
  logout,
} from '../auth.service';

// ─── Mock the configured axios instance ──────────────────────────────────────
// We mock the lib/axios module so no real HTTP calls are made.
// All tests control what the API "returns" via mockResolvedValueOnce /
// mockRejectedValueOnce — this is the core of TDD for services.
jest.mock('../../../lib/axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get:  jest.fn(),
    put:  jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockApiClient = require('../../../lib/axios').default;

// ─── Shared test data ─────────────────────────────────────────────────────────
const MOCK_TEAM_MEMBER = {
  id: 'tm_001',
  phone_number: '+353871234567',
  full_name: 'Mr John Doe',
  email: 'john@drs.ie',
  role: 'admin',
  department: 'fire',
  employee_id: 'EMP001',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_TOKENS = {
  access_token: 'eyJhbGciOiJIUzI1NiJ9.mock',
  refresh_token: 'eyJhbGciOiJIUzI1NiJ9.refresh',
  token_type: 'bearer',
  expires_in: 31536000,
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ══════════════════════════════════════════════════════════════════════════════
// login()
// ══════════════════════════════════════════════════════════════════════════════
describe('login()', () => {
  describe('happy path', () => {
    it('calls POST /emergency-team/login with email and password', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      await login('john@drs.ie', 'Secret@123');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/emergency-team/login',
        { email: 'john@drs.ie', password: 'Secret@123' }
      );
    });

    it('returns success: true on valid credentials', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.success).toBe(true);
    });

    it('maps team_member.id → user.userId', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.data?.user.userId).toBe('tm_001');
    });

    it('maps tokens.access_token → token', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.data?.token).toBe(MOCK_TOKENS.access_token);
    });

    it('maps tokens.refresh_token → refreshToken', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      // Both tokens must be returned so AuthContext can save both to localStorage.
      // Without this, refreshToken is never stored and the user gets logged out
      // when the access token expires.
      expect(result.data?.refreshToken).toBe(MOCK_TOKENS.refresh_token);
    });

    it('maps team_member.role correctly', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.data?.user.role).toBe('admin');
    });

    it('maps team_member.email, phone_number, full_name correctly', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { team_member: MOCK_TEAM_MEMBER, tokens: MOCK_TOKENS },
      });

      const result = await login('john@drs.ie', 'Secret@123');
      const user = result.data?.user;

      expect(user?.email).toBe('john@drs.ie');
      expect(user?.phoneNumber).toBe('+353871234567');
      expect(user?.fullName).toBe('Mr John Doe');
    });
  });

  describe('error handling', () => {
    it('returns success: false on 401 invalid credentials', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid credentials' } },
      });

      const result = await login('wrong@drs.ie', 'wrongpass');

      expect(result.success).toBe(false);
    });

    it('returns the API error message on 401', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Invalid credentials' } },
      });

      const result = await login('wrong@drs.ie', 'wrongpass');

      expect(result.message).toBe('Invalid credentials');
    });

    it('returns success: false on 422 validation error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 422, data: { detail: [{ msg: 'field required' }] } },
      });

      const result = await login('', '');

      expect(result.success).toBe(false);
    });

    it('returns a fallback message when no API error detail is present', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('handles network errors (no response) gracefully', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await login('john@drs.ie', 'Secret@123');

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// requestSignupOTP()
// ══════════════════════════════════════════════════════════════════════════════
describe('requestSignupOTP()', () => {
  const signupData = {
    phoneNumber: '+353871234567',
    password: 'Secret@123',
    email: 'john@drs.ie',
    role: 'admin',
    department: 'fire',
    salutation: 'mr',
    firstName: 'John',
    lastName: 'Doe',
  };

  describe('happy path', () => {
    it('calls POST /emergency-team/register', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent to +353871234567' },
      });

      await requestSignupOTP(signupData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/emergency-team/register',
        expect.any(Object)
      );
    });

    it('sends phone_number in snake_case', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent' },
      });

      await requestSignupOTP(signupData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ phone_number: '+353871234567' })
      );
    });

    it('sends full_name constructed from salutation + first + last name', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent' },
      });

      await requestSignupOTP(signupData);

      const body = mockApiClient.post.mock.calls[0][1];
      expect(body.full_name).toMatch(/John/);
      expect(body.full_name).toMatch(/Doe/);
    });

    it('sends role and department', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent' },
      });

      await requestSignupOTP(signupData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ role: 'admin', department: 'fire' })
      );
    });

    it('returns success: true on 200 response', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent successfully' },
      });

      const result = await requestSignupOTP(signupData);

      expect(result.success).toBe(true);
    });

    it('includes the API message in the response', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'OTP sent to +353871234567' },
      });

      const result = await requestSignupOTP(signupData);

      expect(result.message).toBe('OTP sent to +353871234567');
    });
  });

  describe('error handling', () => {
    it('returns success: false when phone number already registered (400)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Phone number already registered' } },
      });

      const result = await requestSignupOTP(signupData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Phone number already registered');
    });

    it('returns success: false on 422 validation error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'Validation failed' } },
      });

      const result = await requestSignupOTP({ ...signupData, phoneNumber: 'bad' });

      expect(result.success).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await requestSignupOTP(signupData);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// verifySignupOTP()
// ══════════════════════════════════════════════════════════════════════════════
describe('verifySignupOTP()', () => {
  const MOCK_VERIFY_RESPONSE = {
    team_member: MOCK_TEAM_MEMBER,
    tokens: MOCK_TOKENS,
  };

  describe('happy path', () => {
    it('calls POST /emergency-team/register/verify', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/emergency-team/register/verify',
        expect.any(Object)
      );
    });

    it('sends phone_number and otp in the request body', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        { phone_number: '+353871234567', otp: '123456' }
      );
    });

    it('returns success: true on 201 response', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(result.success).toBe(true);
    });

    it('returns user and token in data', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('token');
    });

    it('extracts token from tokens.access_token', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      // ✅ Fixed — service now reads response.data.tokens.access_token correctly
      expect(result.data?.token).toBe(MOCK_TOKENS.access_token);
    });

    it('also returns the refresh token', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_VERIFY_RESPONSE });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(result.data?.refreshToken).toBe(MOCK_TOKENS.refresh_token);
    });
  });

  describe('error handling', () => {
    it('returns success: false on invalid OTP (400)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Invalid or expired OTP' } },
      });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '000000' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired OTP');
    });

    it('returns success: false on expired OTP', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'OTP has expired' } },
      });

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(result.success).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await verifySignupOTP({ mobileNumber: '+353871234567', otpCode: '123456' });

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// changePassword()
// ══════════════════════════════════════════════════════════════════════════════
describe('changePassword()', () => {
  describe('happy path', () => {
    it('calls POST /emergency-team/change-password with team_member_id as query param', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      await changePassword({
        teamMemberId: 'tm_001',
        oldPassword: 'OldPass@1',
        newPassword: 'NewPass@1',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('team_member_id=tm_001'),
        expect.any(Object)
      );
    });

    it('sends old_password and new_password in snake_case', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      await changePassword({
        teamMemberId: 'tm_001',
        oldPassword: 'OldPass@1',
        newPassword: 'NewPass@1',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        { old_password: 'OldPass@1', new_password: 'NewPass@1' }
      );
    });

    it('returns success: true on password change', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      const result = await changePassword({
        teamMemberId: 'tm_001',
        oldPassword: 'OldPass@1',
        newPassword: 'NewPass@1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns success: false when old password is wrong', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Current password is incorrect' } },
      });

      const result = await changePassword({
        teamMemberId: 'tm_001',
        oldPassword: 'WrongPass',
        newPassword: 'NewPass@1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Current password is incorrect');
    });

    it('returns success: false on 422 (new password too weak)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'Password too short' } },
      });

      const result = await changePassword({
        teamMemberId: 'tm_001',
        oldPassword: 'OldPass@1',
        newPassword: 'weak',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// logout()
// ══════════════════════════════════════════════════════════════════════════════
describe('logout()', () => {
  it('removes token from localStorage', () => {
    localStorage.setItem('token', 'tok_123');
    logout();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('removes user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    logout();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('removes refreshToken from localStorage', () => {
    localStorage.setItem('refreshToken', 'refresh_xyz');
    logout();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('does not throw even if localStorage is already empty', () => {
    expect(() => logout()).not.toThrow();
  });

  it('makes no API call', () => {
    logout();
    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(mockApiClient.get).not.toHaveBeenCalled();
  });
});