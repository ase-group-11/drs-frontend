jest.mock('../authService', () => ({ authRequest: jest.fn() }));
import { mapService } from '../mapService';
const { authRequest } = require('../authService');

const BOUNDS = '51,-7,55,-5';
const MOCK_D = { id: 'd1', disaster_type: 'FIRE', latitude: 53.3, longitude: -6.2, severity: 'HIGH', status: 'active', created_at: new Date().toISOString(), location_address: 'Dublin' };

beforeEach(() => jest.clearAllMocks());

describe('mapService.formatBounds', () => {
  it('formats four coordinates into a bounds string', () => {
    expect(mapService.formatBounds(51.0, -7.0, 55.0, -5.0)).toBe('51,-7,55,-5');
  });
});

describe('mapService.getDisasters', () => {
  it('returns converted disasters from a flat array response', async () => {
    authRequest.mockResolvedValueOnce([MOCK_D]);
    const r = await mapService.getDisasters(BOUNDS);
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('fire');
  });
  it('returns converted disasters from a nested disasters object', async () => {
    authRequest.mockResolvedValueOnce({ disasters: [MOCK_D] });
    const r = await mapService.getDisasters(BOUNDS);
    expect(r).toHaveLength(1);
  });
  it('returns empty array for unexpected response format', async () => {
    authRequest.mockResolvedValueOnce({ unexpected: true });
    const r = await mapService.getDisasters(BOUNDS);
    expect(r).toEqual([]);
  });
  it('throws when the network call fails', async () => {
    authRequest.mockRejectedValueOnce(new Error('Network error'));
    await expect(mapService.getDisasters(BOUNDS)).rejects.toThrow('Network error');
  });
});

describe('mapService.getTraffic', () => {
  it('calls the traffic endpoint with bounds', async () => {
    authRequest.mockResolvedValueOnce({ data: [] });
    await mapService.getTraffic(BOUNDS);
    expect(authRequest).toHaveBeenCalledWith(expect.stringContaining(`/live-map/traffic?bounds=${BOUNDS}`));
  });
});

describe('mapService.getPendingDisasters', () => {
  it('calls the pending disasters endpoint', async () => {
    authRequest.mockResolvedValueOnce([]);
    await mapService.getPendingDisasters();
    expect(authRequest).toHaveBeenCalledWith(expect.stringContaining('/live-map/pending-disasters'));
  });
});