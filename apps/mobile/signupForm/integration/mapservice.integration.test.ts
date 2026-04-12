/**
 * INTEGRATION TESTS — mapService with real authRequest logic
 *
 * Tests the full path: mapService → authRequest → fetch → response parsing
 * AsyncStorage provides a valid token so authRequest proceeds normally.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Do NOT mock authRequest — we want the real implementation to run
// so we can test the full service→request→response pipeline.

const mockToken = 'Bearer test_access_token';

// Pre-seed AsyncStorage with a token before each test
beforeEach(async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key === '@auth/access_token') return Promise.resolve('test_access_token');
    return Promise.resolve(null);
  });
  (global.fetch as jest.Mock).mockReset();
});

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

const jsonResponse = (body: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const makeBackendDisaster = (id = 'dis-1', type = 'FLOOD') => ({
  id,
  type,
  severity: 'MEDIUM',
  description: 'Flooding on Quays',
  status: 'active',
  created_at: '2024-03-01T08:00:00Z',
  location: { lat: 53.3488, lon: -6.2621 },
});

// ─────────────────────────────────────────────────────────────────────────
// getDisasters — full pipeline
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.getDisasters — integration', () => {
  it('returns parsed disasters from a real { disasters: [] } API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ disasters: [makeBackendDisaster(), makeBackendDisaster('dis-2', 'FIRE')] })
    );

    const { mapService } = require('../../src/services/mapService');
    const result = await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 50);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'dis-1',
      type: 'flood',
      severity: 'medium',
      location: { latitude: 53.3488, longitude: -6.2621 },
    });
  });

  it('sends the Authorization header from AsyncStorage token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ disasters: [] }));

    const { mapService } = require('../../src/services/mapService');
    await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 50);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers?.Authorization).toBe('Bearer test_access_token');
  });

  it('includes the bounds query param in the request URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse([]));

    const { mapService } = require('../../src/services/mapService');
    await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 25);

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('bounds=53.20,-6.45,53.45,-6.05');
    expect(url).toContain('limit=25');
  });

  it('throws ApiError on 401 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ detail: 'Unauthorized' }, 401)
    );

    const { mapService } = require('../../src/services/mapService');
    await expect(
      mapService.getDisasters('53.20,-6.45,53.45,-6.05', 50)
    ).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('throws ApiError on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    const { mapService } = require('../../src/services/mapService');
    await expect(
      mapService.getDisasters('53.20,-6.45,53.45,-6.05', 50)
    ).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('returns empty array for an empty disasters list', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ disasters: [] }));

    const { mapService } = require('../../src/services/mapService');
    const result = await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 50);
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getTraffic — integration
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.getTraffic — integration', () => {
  it('returns raw traffic data from the API', async () => {
    const trafficPayload = {
      available: true,
      traffic: { flow: [{ congestion_level: 'heavy', coordinates: [] }] },
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(trafficPayload));

    const { mapService } = require('../../src/services/mapService');
    const result = await mapService.getTraffic('53.20,-6.45,53.45,-6.05');
    expect(result).toEqual(trafficPayload);
  });

  it('includes bounds in the URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ available: false }));

    const { mapService } = require('../../src/services/mapService');
    await mapService.getTraffic('53.33,-6.45,53.45,-6.25');

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('bounds=53.33,-6.45,53.45,-6.25');
  });
});