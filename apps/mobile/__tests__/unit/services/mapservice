/**
 * UNIT TESTS — src/services/mapService.ts
 *
 * Tests getDisasters (coordinate parsing, deduplication, bad data),
 * formatBounds, and error propagation — all via mocked authRequest.
 */

import { mapService } from '../../src/services/mapService';

// Mock authService so no real HTTP calls happen
jest.mock('../../src/services/authService', () => ({
  ApiError: class ApiError extends Error {
    status: number; data: any;
    constructor(message: string, status: number, data?: any) {
      super(message); this.name = 'ApiError'; this.status = status; this.data = data;
    }
  },
  authRequest: jest.fn(),
}));

import { authRequest } from '../../src/services/authService';
const mockAuthRequest = authRequest as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────

const makeBackendDisaster = (overrides: any = {}) => ({
  id: 'disaster-1',
  type: 'FIRE',
  severity: 'HIGH',
  description: 'Building fire on Main St',
  status: 'active',
  created_at: '2024-01-15T10:00:00Z',
  location: { lat: 53.3498, lon: -6.2603 },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────
// formatBounds
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.formatBounds', () => {
  it('formats four numbers into a comma-separated string', () => {
    expect(mapService.formatBounds(53.20, -6.45, 53.45, -6.05))
      .toBe('53.2,-6.45,53.45,-6.05');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getDisasters — successful responses
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.getDisasters — success', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses an array response and returns Disaster objects', async () => {
    mockAuthRequest.mockResolvedValue([makeBackendDisaster()]);

    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('disaster-1');
    expect(result[0].type).toBe('fire');         // normalised to lowercase
    expect(result[0].severity).toBe('high');     // normalised to lowercase
    expect(result[0].location.latitude).toBe(53.3498);
    expect(result[0].location.longitude).toBe(-6.2603);
  });

  it('parses a { disasters: [] } envelope response', async () => {
    mockAuthRequest.mockResolvedValue({
      disasters: [makeBackendDisaster(), makeBackendDisaster({ id: 'disaster-2' })],
    });
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for unrecognised response format', async () => {
    mockAuthRequest.mockResolvedValue({ unexpected: 'shape' });
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result).toEqual([]);
  });

  it('silently drops entries with invalid coordinates', async () => {
    mockAuthRequest.mockResolvedValue([
      makeBackendDisaster({ location: { lat: 'not-a-number', lon: -6.2603 } }),
      makeBackendDisaster({ id: 'valid', location: { lat: 53.35, lon: -6.26 } }),
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('silently drops entries with zero coordinates', async () => {
    mockAuthRequest.mockResolvedValue([
      makeBackendDisaster({ location: { lat: 0, lon: 0 } }),
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result).toHaveLength(0);
  });

  it('falls back to top-level lat/lon fields if location.lat is missing', async () => {
    mockAuthRequest.mockResolvedValue([
      { id: 'fallback', type: 'flood', severity: 'low', lat: 53.34, lon: -6.27,
        created_at: new Date().toISOString(), status: 'active' },
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result[0].location.latitude).toBe(53.34);
  });

  it('correctly sets reportedAt as a Date object', async () => {
    mockAuthRequest.mockResolvedValue([makeBackendDisaster()]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result[0].reportedAt).toBeInstanceOf(Date);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getDisasters — error propagation
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.getDisasters — errors', () => {
  it('re-throws ApiError from authRequest', async () => {
    const { ApiError } = require('../../src/services/authService');
    mockAuthRequest.mockRejectedValue(new ApiError('Request timed out.', 408));

    await expect(
      mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50)
    ).rejects.toMatchObject({ message: 'Request timed out.', status: 408 });
  });

  it('passes bounds and limit correctly in the URL', async () => {
    mockAuthRequest.mockResolvedValue([]);
    await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 25);
    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/live-map/disasters?bounds=53.20,-6.45,53.45,-6.05&limit=25'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getTraffic
// ─────────────────────────────────────────────────────────────────────────
describe('mapService.getTraffic', () => {
  it('calls the traffic endpoint with the given bounds', async () => {
    mockAuthRequest.mockResolvedValue({ available: false });
    await mapService.getTraffic('53.20,-6.45,53.45,-6.05');
    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/live-map/traffic?bounds=53.20,-6.45,53.45,-6.05'
    );
  });
});