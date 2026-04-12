/**
 * UNIT TESTS — mapService (complete coverage)
 *
 * Covers all methods:
 *   getReroutePlan  ← new / previously untested
 *   getLiveMapData  ← new / previously untested
 *   getPendingDisasters
 *   getTraffic
 *   formatBounds
 *   getDisasters (coordinate edge cases)
 */

jest.mock('@services/authService', () => ({
  ApiError: class ApiError extends Error {
    status: number; data: any;
    constructor(msg: string, status: number, data?: any) {
      super(msg); this.name = 'ApiError'; this.status = status; this.data = data;
    }
  },
  authRequest: jest.fn(),
}));

import { mapService }   from '@services/mapService';
import { authRequest }  from '@services/authService';

const mockAuthRequest = authRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthRequest.mockResolvedValue(null);
});

// ─── getReroutePlan ──────────────────────────────────────────────────────
describe('mapService.getReroutePlan', () => {
  it('calls /reroute/status/{disasterId}', async () => {
    const plan = { chosen_routes: [], disaster_id: 'dis-1' };
    mockAuthRequest.mockResolvedValue(plan);

    const result = await mapService.getReroutePlan('dis-1');

    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/reroute/status/dis-1',
      expect.anything()
    );
    expect(result).toEqual(plan);
  });

  it('uses the disasterId verbatim in the URL', async () => {
    mockAuthRequest.mockResolvedValue({});
    await mapService.getReroutePlan('abc-uuid-999');
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('abc-uuid-999'),
      expect.anything()
    );
  });

  it('throws when authRequest rejects (disaster not found)', async () => {
    const { ApiError } = require('@services/authService');
    mockAuthRequest.mockRejectedValue(new ApiError('Not found', 404));

    await expect(mapService.getReroutePlan('bad-id'))
      .rejects.toMatchObject({ status: 404 });
  });

  it('returns the full reroute plan object', async () => {
    const plan = {
      disaster_id: 'dis-1',
      chosen_routes: [
        {
          route_id:            'route-a',
          travel_time_seconds: 300,
          length_meters:       1200,
          points:              [[53.35, -6.26], [53.36, -6.27]],
        },
      ],
    };
    mockAuthRequest.mockResolvedValue(plan);

    const result = await mapService.getReroutePlan('dis-1') as any;
    expect(result.chosen_routes).toHaveLength(1);
    expect(result.chosen_routes[0].route_id).toBe('route-a');
  });

  it('returns an empty chosen_routes array when no reroute exists', async () => {
    mockAuthRequest.mockResolvedValue({ chosen_routes: [], disaster_id: 'dis-2' });
    const result = await mapService.getReroutePlan('dis-2') as any;
    expect(result.chosen_routes).toEqual([]);
  });
});

// ─── getLiveMapData ──────────────────────────────────────────────────────
describe('mapService.getLiveMapData', () => {
  it('calls /live-map/data with bounds and zoom', async () => {
    mockAuthRequest.mockResolvedValue({ disasters: [], traffic: [] });
    await mapService.getLiveMapData('53.2,-6.45,53.45,-6.05', 12);

    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/live-map/data?bounds=53.2,-6.45,53.45,-6.05&zoom=12',
      expect.anything()
    );
  });

  it('passes different zoom levels correctly', async () => {
    mockAuthRequest.mockResolvedValue({});
    await mapService.getLiveMapData('53.2,-6.45,53.45,-6.05', 16);
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('zoom=16'),
      expect.anything()
    );
  });

  it('returns the raw API response', async () => {
    const payload = { disasters: [{ id: 'd1' }], traffic: [] };
    mockAuthRequest.mockResolvedValue(payload);
    const result = await mapService.getLiveMapData('53.2,-6.45,53.45,-6.05', 13);
    expect(result).toEqual(payload);
  });
});

// ─── getPendingDisasters ─────────────────────────────────────────────────
describe('mapService.getPendingDisasters', () => {
  it('calls /live-map/pending-disasters with default limit 50', async () => {
    mockAuthRequest.mockResolvedValue([]);
    await mapService.getPendingDisasters();
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('/live-map/pending-disasters?limit=50'),
      expect.anything()
    );
  });

  it('passes custom limit in the URL', async () => {
    mockAuthRequest.mockResolvedValue([]);
    await mapService.getPendingDisasters(10);
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.anything()
    );
  });

  it('returns the raw array from the API', async () => {
    const pending = [{ id: 'p1', status: 'pending' }];
    mockAuthRequest.mockResolvedValue(pending);
    const result = await mapService.getPendingDisasters();
    expect(result).toEqual(pending);
  });
});

// ─── getTraffic ───────────────────────────────────────────────────────────
describe('mapService.getTraffic', () => {
  it('calls /live-map/traffic with the given bounds', async () => {
    mockAuthRequest.mockResolvedValue({ available: false });
    await mapService.getTraffic('53.33,-6.45,53.45,-6.25');
    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/live-map/traffic?bounds=53.33,-6.45,53.45,-6.25',
      expect.anything()
    );
  });

  it('returns available:true with traffic flow data', async () => {
    const payload = {
      available: true,
      traffic: { flow: [{ congestion_level: 'heavy', coordinates: [[53.35, -6.26]] }] },
    };
    mockAuthRequest.mockResolvedValue(payload);
    const result = await mapService.getTraffic('53.33,-6.45,53.45,-6.25') as any;
    expect(result.available).toBe(true);
    expect(result.traffic.flow).toHaveLength(1);
  });

  it('returns available:false when no traffic data', async () => {
    mockAuthRequest.mockResolvedValue({ available: false });
    const result = await mapService.getTraffic('53.33,-6.45,53.45,-6.25') as any;
    expect(result.available).toBe(false);
  });

  it('propagates ApiError from authRequest', async () => {
    const { ApiError } = require('@services/authService');
    mockAuthRequest.mockRejectedValue(new ApiError('Request timed out.', 408));
    await expect(mapService.getTraffic('53.33,-6.45,53.45,-6.25'))
      .rejects.toMatchObject({ status: 408 });
  });
});

// ─── formatBounds ────────────────────────────────────────────────────────
describe('mapService.formatBounds', () => {
  it('formats four numbers as comma-separated string', () => {
    expect(mapService.formatBounds(53.20, -6.45, 53.45, -6.05))
      .toBe('53.2,-6.45,53.45,-6.05');
  });

  it('preserves decimal precision', () => {
    expect(mapService.formatBounds(53.333, -6.666, 53.444, -6.111))
      .toBe('53.333,-6.666,53.444,-6.111');
  });
});

// ─── getDisasters coordinate edge cases ──────────────────────────────────
describe('mapService.getDisasters — coordinate parsing', () => {
  it('falls back to top-level lat/lon when location object is missing', async () => {
    mockAuthRequest.mockResolvedValue([
      { id: 'x1', type: 'fire', severity: 'low', lat: 53.34, lon: -6.27,
        created_at: new Date().toISOString(), status: 'active' },
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result[0].location.latitude).toBe(53.34);
    expect(result[0].location.longitude).toBe(-6.27);
  });

  it('falls back to latitude/longitude field names', async () => {
    mockAuthRequest.mockResolvedValue([
      { id: 'x2', type: 'flood', severity: 'medium',
        latitude: 53.35, longitude: -6.26,
        created_at: new Date().toISOString(), status: 'active' },
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result[0].location.latitude).toBe(53.35);
  });

  it('drops entries where both location formats are missing', async () => {
    mockAuthRequest.mockResolvedValue([
      { id: 'bad', type: 'storm', severity: 'high', status: 'active' },
    ]);
    const result = await mapService.getDisasters('53.2,-6.45,53.45,-6.05', 50);
    expect(result).toHaveLength(0);
  });
});