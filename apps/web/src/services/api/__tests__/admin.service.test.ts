/**
 * TDD Tests — admin.service.ts
 *
 * ─── CURRENT vs TARGET state ─────────────────────────────────────────────────
 *
 * CURRENT (placeholder):
 *   getDisasterReports()         → GET   /admin/disaster-reports          (wrong)
 *   getDisasterReportById()      → GET   /admin/disaster-reports/{id}     (wrong + fallback)
 *   updateDisasterReportStatus() → PATCH /admin/disaster-reports/{id}/status (wrong method+path)
 *   escalateDisasterSeverity()   → PATCH /admin/disaster-reports/{id}/severity (wrong method+path)
 *   dispatchUnits()              → POST  /admin/disaster-reports/{id}/dispatch (wrong path)
 *
 * TARGET (real API from OpenAPI spec):
 *   getDisasterReports()         → GET  /disasters/all
 *   getDisasterReportById()      → GET  /disasters/{id}
 *   updateDisasterReportStatus() → POST /disasters/{id}/resolve
 *   escalateDisasterSeverity()   → POST /disasters/{id}/escalate
 *   dispatchUnits()              → POST /disasters/{id}/dispatch
 *
 * ─── What is RED vs GREEN right now ─────────────────────────────────────────
 *   ✅ "return shape" blocks             → green (service works, just wrong endpoint)
 *   ✅ error handling on patch functions → green (no fallback, errors propagate correctly)
 *   ❌ Endpoint URL tests                → red (wrong URLs)
 *   ❌ getDisasterReports error handling → red (has fallback, returns success: true on error)
 *   ❌ getDisasterReportById error       → red (has fallback)
 *
 * Run: npm test -- --watchAll=false --testPathPattern="admin.service"
 */

import {
  getDisasterReports,
  getDisasterReportById,
  updateDisasterReportStatus,
  escalateDisasterSeverity,
  dispatchUnits,
} from '../admin.service';

// ─── Mock the configured axios instance ──────────────────────────────────────
// IMPORTANT: Must include patch — admin.service currently uses apiClient.patch
// for updateDisasterReportStatus and escalateDisasterSeverity.
// Missing it causes "TypeError: Cannot read properties of undefined" in tests.
jest.mock('../../../lib/axios', () => ({
  __esModule: true,
  default: {
    post:   jest.fn(),
    get:    jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
    patch:  jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockApiClient = require('../../../lib/axios').default;

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const MOCK_DISASTER = {
  id: 'dis_001',
  tracking_id: 'TRK-001',
  type: 'FIRE',
  severity: 'HIGH',
  status: 'ACTIVE',
  report_status: 'VERIFIED',
  location: { lat: 53.3498, lon: -6.2603 },
  description: 'Structure fire',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_user_reported: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getDisasterReports()
// ══════════════════════════════════════════════════════════════════════════════
describe('getDisasterReports()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      const result = await getDisasterReports();
      expect(result.success).toBe(true);
    });

    it('returns a data property', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      const result = await getDisasterReports();
      expect(result).toHaveProperty('data');
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls GET /disasters/all', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      await getDisasterReports();
      // ❌ Currently fails — service calls /admin/disaster-reports
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/disasters/all',
        expect.anything()
      );
    });

    it('passes severity as a query param', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [] });
      await getDisasterReports({ severity: 'HIGH' });
      // ❌ Currently fails — wrong endpoint
      const call = mockApiClient.get.mock.calls[0];
      const hasParam =
        call[1]?.params?.severity === 'HIGH' ||
        (typeof call[0] === 'string' && call[0].includes('HIGH'));
      expect(hasParam).toBe(true);
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Emergency team access required' } },
      });
      const result = await getDisasterReports();
      // ❌ Currently fails — service swallows error and returns fallback dummy data
      expect(result.success).toBe(false);
    });

    it('returns success: false on 500 server error', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });
      const result = await getDisasterReports();
      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));
      const result = await getDisasterReports();
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getDisasterReportById()
// ══════════════════════════════════════════════════════════════════════════════
describe('getDisasterReportById()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_DISASTER });
      const result = await getDisasterReportById('dis_001');
      expect(result.success).toBe(true);
    });

    it('returns a data property with an id field', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_DISASTER });
      const result = await getDisasterReportById('dis_001');
      expect(result.data).toHaveProperty('id');
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls GET /disasters/{id}', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_DISASTER });
      await getDisasterReportById('dis_001');
      // ❌ Currently fails — service calls /admin/disaster-reports/dis_001
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/disasters/dis_001')
      );
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false on 404 not found', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Disaster not found' } },
      });
      const result = await getDisasterReportById('nonexistent');
      // ❌ Currently fails — service swallows error and returns fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });
      const result = await getDisasterReportById('dis_001');
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateDisasterReportStatus()
// Current: PATCH /admin/disaster-reports/{id}/status  → sends { status }
// Target:  POST  /disasters/{id}/resolve              → sends { resolution_notes }
// Note: This function has NO fallback — errors propagate correctly already.
// ══════════════════════════════════════════════════════════════════════════════
describe('updateDisasterReportStatus()', () => {

  describe('return shape — passes now using current PATCH behaviour', () => {
    it('returns success: true when the API call succeeds', async () => {
      // Service currently uses patch → mock patch for this happy path
      mockApiClient.patch.mockResolvedValueOnce({ data: { message: 'Status updated' } });
      const result = await updateDisasterReportStatus('dis_001', 'resolved');
      expect(result.success).toBe(true);
    });
  });

  describe('endpoint — RED until service uses POST + correct URL', () => {
    it('calls POST /disasters/{id}/resolve', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Disaster resolved' } });
      await updateDisasterReportStatus('dis_001', 'resolved');
      // ❌ Currently fails — service calls PATCH /admin/disaster-reports/dis_001/status
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/disasters/dis_001/resolve'),
        expect.any(Object)
      );
    });
  });

  describe('error handling — already works correctly, must stay green', () => {
    it('returns success: false on 404 not found', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Disaster not found' } },
      });
      const result = await updateDisasterReportStatus('nonexistent', 'resolved');
      // ✅ Passes now — no fallback in this function
      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Emergency team access required' } },
      });
      const result = await updateDisasterReportStatus('dis_001', 'resolved');
      expect(result.success).toBe(false);
    });

    it('returns the API error message', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Invalid status transition' } },
      });
      const result = await updateDisasterReportStatus('dis_001', 'bad_status');
      expect(result.message).toBe('Invalid status transition');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// escalateDisasterSeverity()
// Current: PATCH /admin/disaster-reports/{id}/severity  → sends { severity }
// Target:  POST  /disasters/{id}/escalate               → sends { new_severity }
// Note: This function has NO fallback — errors propagate correctly already.
// ══════════════════════════════════════════════════════════════════════════════
describe('escalateDisasterSeverity()', () => {

  describe('return shape — passes now using current PATCH behaviour', () => {
    it('returns success: true when the API call succeeds', async () => {
      mockApiClient.patch.mockResolvedValueOnce({ data: { message: 'Severity escalated' } });
      const result = await escalateDisasterSeverity('dis_001', 'CRITICAL');
      expect(result.success).toBe(true);
    });
  });

  describe('endpoint — RED until service uses POST + correct URL + body key', () => {
    it('calls POST /disasters/{id}/escalate', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Escalated' } });
      await escalateDisasterSeverity('dis_001', 'CRITICAL');
      // ❌ Currently fails — service calls PATCH /admin/disaster-reports/dis_001/severity
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/disasters/dis_001/escalate'),
        expect.any(Object)
      );
    });

    it('sends new_severity (not severity) in the request body', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      await escalateDisasterSeverity('dis_001', 'CRITICAL');
      // ❌ Currently fails — service sends { severity } not { new_severity }
      const body = mockApiClient.post.mock.calls[0]?.[1];
      expect(body).toHaveProperty('new_severity', 'CRITICAL');
    });
  });

  describe('error handling — already works correctly, must stay green', () => {
    it('returns success: false on 404 disaster not found', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Disaster not found' } },
      });
      const result = await escalateDisasterSeverity('nonexistent', 'CRITICAL');
      // ✅ Passes now — no fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false on 422 invalid severity', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'Invalid severity' } },
      });
      const result = await escalateDisasterSeverity('dis_001', 'INVALID');
      expect(result.success).toBe(false);
    });

    it('returns the API error message', async () => {
      mockApiClient.patch.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Disaster not found' } },
      });
      const result = await escalateDisasterSeverity('nonexistent', 'CRITICAL');
      expect(result.message).toBe('Disaster not found');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// dispatchUnits()
// Current: POST /admin/disaster-reports/{id}/dispatch  → sends { units: number }
// Target:  POST /disasters/{id}/dispatch               → sends { unit_ids: string[] }
// Note: This function has NO fallback — errors propagate correctly already.
// ══════════════════════════════════════════════════════════════════════════════
describe('dispatchUnits()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true when dispatch succeeds', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Units dispatched' } });
      const result = await dispatchUnits('dis_001', 3);
      expect(result.success).toBe(true);
    });
  });

  describe('endpoint — RED until service uses correct URL + body shape', () => {
    it('calls POST /disasters/{id}/dispatch', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      await dispatchUnits('dis_001', 3);
      // ❌ Currently fails — service calls /admin/disaster-reports/dis_001/dispatch
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/disasters/dis_001/dispatch'),
        expect.any(Object)
      );
    });

    it('sends unit_ids array (not a units count)', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      await dispatchUnits('dis_001', 3);
      // ❌ Currently fails — service sends { units: 3 } not { unit_ids: [...] }
      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).toHaveProperty('unit_ids');
      expect(Array.isArray(body.unit_ids)).toBe(true);
    });
  });

  describe('error handling — already works correctly, must stay green', () => {
    it('returns success: false when no units available (400)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'No available units' } },
      });
      const result = await dispatchUnits('dis_001', 3);
      // ✅ Passes now — no fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Emergency team access required' } },
      });
      const result = await dispatchUnits('dis_001', 1);
      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));
      const result = await dispatchUnits('dis_001', 1);
      expect(result.success).toBe(false);
    });
  });
});