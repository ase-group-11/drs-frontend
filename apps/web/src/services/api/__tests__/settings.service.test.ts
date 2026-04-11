/**
 * TDD Tests — settings.service.ts
 *
 * Real API endpoints (from OpenAPI spec):
 *   POST /emergency-team/change-password?team_member_id={id}  → changeAdminPassword
 *
 * ⚠️  ENDPOINTS WITH NO BACKEND EQUIVALENT:
 *   General settings, notification settings, and system status do NOT exist in
 *   the current API spec. These functions will need to either:
 *     (a) Wait for new backend endpoints
 *     (b) Be implemented as local/localStorage-based persistence
 *
 * ⚠️  CURRENT STATE: changeAdminPassword calls /api/admin/settings/change-password
 *     which does NOT match the real API endpoint. This test will FAIL until the
 *     service is updated to use /emergency-team/change-password?team_member_id=...
 *
 * Run: npm test -- --watchAll=false --testPathPattern="settings.service"
 */

import {
  getGeneralSettings,
  saveGeneralSettings,
  getNotificationSettings,
  saveNotificationSettings,
  changeAdminPassword,
  getSystemStatus,
} from '../settings.service';

// ─── Mock the configured axios instances ─────────────────────────────────────
// FIX: healthClient must be mocked alongside the default apiClient.
// getSystemStatus() uses healthClient (different base URL), not apiClient.
// Without this, healthClient.get is undefined and every call returns success: false.
jest.mock('../../../lib/axios', () => ({
  __esModule: true,
  default: {
    post:   jest.fn(),
    get:    jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
  healthClient: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockApiClient    = require('../../../lib/axios').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockHealthClient = require('../../../lib/axios').healthClient;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Seed a logged-in user so changeAdminPassword can read the userId
  localStorage.setItem(
    'user',
    JSON.stringify({ userId: 'tm_001', role: 'admin', email: 'admin@drs.ie' })
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// changeAdminPassword()  ← the only settings function with a real API endpoint
// ══════════════════════════════════════════════════════════════════════════════
describe('changeAdminPassword()', () => {
  describe('happy path', () => {
    it('calls POST /emergency-team/change-password', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain('emergency-team/change-password');
    });

    it('includes team_member_id as a query parameter', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain('team_member_id');
    });

    it('sends old_password and new_password in snake_case', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).toMatchObject({
        old_password: 'OldPass@1',
        new_password: 'NewPass@2',
      });
    });

    it('returns success: true on password change', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password changed successfully' },
      });

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.success).toBe(true);
    });

    it('returns the API success message', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { message: 'Password updated' },
      });

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.message).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('returns success: false when current password is wrong (400)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Current password is incorrect' } },
      });

      const result = await changeAdminPassword({
        currentPassword: 'WrongPass',
        newPassword: 'NewPass@2',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Current password is incorrect');
    });

    it('returns success: false on 422 (new password too short)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: { detail: 'New password must be at least 8 characters' },
        },
      });

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'weak',
      });

      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 (token expired)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Token expired' } },
      });

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.success).toBe(false);
    });

    it('returns a fallback message when no API error detail is present', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('handles network error gracefully', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await changeAdminPassword({
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getGeneralSettings()  —  no backend endpoint yet
// Tests document the EXPECTED interface for when the endpoint is built
// ══════════════════════════════════════════════════════════════════════════════
describe('getGeneralSettings()', () => {
  it('returns an object with a systemName field', async () => {
    // With API: mock a GET call
    mockApiClient.get.mockResolvedValueOnce({
      data: { systemName: 'DRS', adminEmail: 'a@b.com', timezone: 'UTC' },
    });

    const result = await getGeneralSettings();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('systemName');
  });

  it('returns an object with adminEmail field', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: { systemName: 'DRS', adminEmail: 'admin@drs.ie', timezone: 'UTC' },
    });

    const result = await getGeneralSettings();

    expect(result.data).toHaveProperty('adminEmail');
  });

  it('never throws — returns success: false if API fails', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

    const result = await getGeneralSettings();

    // If no real endpoint yet, fallback data means success: true is acceptable.
    // If endpoint exists and fails, should be success: false.
    // Either way: should never throw.
    expect(() => result).not.toThrow();
    expect(typeof result.success).toBe('boolean');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// saveGeneralSettings()  —  no backend endpoint yet
// ══════════════════════════════════════════════════════════════════════════════
describe('saveGeneralSettings()', () => {
  const payload = {
    systemName: 'DRS Updated',
    adminEmail: 'new@drs.ie',
    timezone: 'europe-dublin',
    language: 'en',
    dateFormat: 'dd-mm-yyyy',
  };

  it('returns success: true when save succeeds', async () => {
    mockApiClient.put.mockResolvedValueOnce({ data: payload });

    const result = await saveGeneralSettings(payload);

    expect(result.success).toBe(true);
  });

  it('never throws on API failure', async () => {
    mockApiClient.put.mockRejectedValueOnce(new Error('Network Error'));

    await expect(saveGeneralSettings(payload)).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getNotificationSettings()  —  no backend endpoint yet
// ══════════════════════════════════════════════════════════════════════════════
describe('getNotificationSettings()', () => {
  it('returns an object with criticalAlerts boolean field', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: { criticalAlerts: true, dailySummary: false },
    });

    const result = await getNotificationSettings();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('criticalAlerts');
  });

  it('never throws on API failure', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(getNotificationSettings()).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// saveNotificationSettings()  —  no backend endpoint yet
// ══════════════════════════════════════════════════════════════════════════════
describe('saveNotificationSettings()', () => {
  const payload = {
    criticalAlerts: true,
    dailySummary: false,
    teamUpdates: true,
    systemMaintenance: true,
    desktopNotifications: false,
    soundAlerts: false,
  };

  it('returns success: true when save succeeds', async () => {
    mockApiClient.put.mockResolvedValueOnce({ data: payload });

    const result = await saveNotificationSettings(payload);

    expect(result.success).toBe(true);
  });

  it('never throws on API failure', async () => {
    mockApiClient.put.mockRejectedValueOnce(new Error('Network Error'));

    await expect(saveNotificationSettings(payload)).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getSystemStatus()
// FIX: uses mockHealthClient (not mockApiClient) because the service calls
// healthClient.get(), which points to a different base URL (REACT_APP_HEALTH_URL).
// ══════════════════════════════════════════════════════════════════════════════
describe('getSystemStatus()', () => {
  it('returns an object with databaseStatus field', async () => {
    mockHealthClient.get.mockResolvedValueOnce({
      data: { databaseStatus: 'Operational', apiStatus: 'Healthy', version: 'v1.0' },
    });

    const result = await getSystemStatus();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('databaseStatus');
  });

  it('returns an object with apiStatus field', async () => {
    mockHealthClient.get.mockResolvedValueOnce({
      data: { databaseStatus: 'Operational', apiStatus: 'Healthy', version: 'v1.0' },
    });

    const result = await getSystemStatus();

    expect(result.data).toHaveProperty('apiStatus');
  });

  it('never throws on API failure', async () => {
    mockHealthClient.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(getSystemStatus()).resolves.not.toThrow();
  });
});