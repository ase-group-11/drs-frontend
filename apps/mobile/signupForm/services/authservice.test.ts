/**
 * UNIT TESTS — src/services/authService.ts
 *
 * Tests ApiError construction, rawRequest timeout/network-failure mapping,
 * token storage helpers, and getStoredUser.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../../src/services/authService';

// We test ApiError as a pure unit — no imports from authService itself
// needed for the class (it's exported directly).

// ─────────────────────────────────────────────────────────────────────────
// ApiError
// ─────────────────────────────────────────────────────────────────────────
describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('Something went wrong', 500);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets name to "ApiError"', () => {
    const err = new ApiError('Bad request', 400);
    expect(err.name).toBe('ApiError');
  });

  it('stores the message correctly', () => {
    const err = new ApiError('Not found', 404);
    expect(err.message).toBe('Not found');
  });

  it('stores the HTTP status code', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err.status).toBe(401);
  });

  it('stores optional data payload', () => {
    const payload = { detail: 'Invalid token' };
    const err = new ApiError('Unauthorized', 401, payload);
    expect(err.data).toEqual(payload);
  });

  it('data is undefined when not provided', () => {
    const err = new ApiError('Server error', 500);
    expect(err.data).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// authService.getStoredUser
// ─────────────────────────────────────────────────────────────────────────
describe('authService.getStoredUser', () => {
  // Import the real authService for this block
  let authService: any;
  beforeAll(() => {
    authService = require('../../src/services/authService').authService;
  });

  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockReset();
  });

  it('returns parsed user when @auth/user_data is set', async () => {
    const user = { id: 'u1', full_name: 'John Doe', phone_number: '0871234567' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(user));
    const result = await authService.getStoredUser();
    expect(result).toEqual(user);
  });

  it('returns null when @auth/user_data is not set', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await authService.getStoredUser();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// rawRequest — timeout and network error mapping (via fetch mock)
// ─────────────────────────────────────────────────────────────────────────
describe('rawRequest — error mapping', () => {
  // Access rawRequest indirectly via authService login (which uses rawRequest)
  // We test the public-facing error shape, not the private function directly.

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('throws ApiError with status 408 when AbortController fires (timeout)', async () => {
    // Simulate AbortError from fetch
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    const { authService } = require('../../src/services/authService');
    await expect(
      authService.login({ phone_number: '+3530871234567' })
    ).rejects.toMatchObject({ name: 'ApiError', status: 408, message: 'Request timed out.' });
  });

  it('throws ApiError with status 0 for network failures', async () => {
    const networkError = new Error('Network request failed');
    (global.fetch as jest.Mock).mockRejectedValue(networkError);

    const { authService } = require('../../src/services/authService');
    await expect(
      authService.login({ phone_number: '+3530871234567' })
    ).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('throws ApiError with server status when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Validation error' }),
    });

    const { authService } = require('../../src/services/authService');
    await expect(
      authService.login({ phone_number: '+3530871234567' })
    ).rejects.toMatchObject({ name: 'ApiError', status: 422 });
  });

  it('returns data on a successful 200 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'OTP sent', phone_number: '+3530871234567' }),
    });

    const { authService } = require('../../src/services/authService');
    const result = await authService.login({ phone_number: '+3530871234567' });
    expect(result).toMatchObject({ message: 'OTP sent' });
  });
});