global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

jest.mock('../authService', () => ({
  authService: { getAuthHeader: jest.fn(() => ({ Authorization: 'Bearer mock-token' })) },
  authRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number; data?: any;
    constructor(msg: string, status: number, data?: any) { super(msg); this.status = status; this.data = data; }
  },
}));

import { disasterService } from '../disasterService';
const { authRequest, ApiError } = require('../authService');

const BASE = {
  user_id: 'u1', location_address: 'Dublin', disaster_type: 'FIRE' as const,
  severity: 'HIGH' as const, description: 'Test', latitude: 53.3, longitude: -6.2,
};

beforeEach(() => jest.clearAllMocks());

describe('disasterService.createReport', () => {
  it('sends FormData POST to the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'r3', status: 'pending' }) });
    const r = await disasterService.createReport(BASE);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/disaster-reports/submit'), expect.objectContaining({ method: 'POST' }));
    expect(r.id).toBe('r3');
  });
  it('throws ApiError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: 'Unauthorized' }) });
    await expect(disasterService.createReport(BASE)).rejects.toBeInstanceOf(ApiError);
  });
  it('throws a 408 ApiError on timeout', async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(disasterService.createReport(BASE)).rejects.toMatchObject({ status: 408 });
  });
});

describe('disasterService.getUserReports', () => {
  it('fetches and returns user reports correctly', async () => {
    authRequest.mockResolvedValueOnce({ reports: [{ id: 'r1', disaster_type: 'FIRE' }], count: 1, user_id: 'u1' });
    const r = await disasterService.getUserReports('u1');
    expect(r.reports).toHaveLength(1);
    expect(r.reports[0].disaster_type).toBe('FIRE');
  });
  it('getMyReports returns a flat array', async () => {
    authRequest.mockResolvedValueOnce({ reports: [{ id: 'r2', disaster_type: 'FLOOD' }], count: 1, user_id: 'u1' });
    const r = await disasterService.getMyReports('u1');
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].disaster_type).toBe('FLOOD');
  });
});

describe('disasterService.getReport', () => {
  it('fetches a single report by ID', async () => {
    authRequest.mockResolvedValueOnce({ id: 'r5', disaster_type: 'STORM' });
    const r = await disasterService.getReport('r5');
    expect(r.id).toBe('r5');
  });
});