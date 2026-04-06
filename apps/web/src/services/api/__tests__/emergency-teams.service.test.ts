/**
 * TDD Tests — emergency-teams.service.ts
 *
 * ─── CURRENT vs TARGET state ─────────────────────────────────────────────────
 *
 * CURRENT (placeholder):
 *   getTeams()          → GET /api/admin/teams          (wrong)
 *   createTeam()        → POST /api/admin/teams         (wrong)
 *   deployUnit()        → POST /api/admin/teams/{id}/deploy (wrong)
 *   decommissionUnit()  → POST /api/admin/teams/{id}/decommission (wrong)
 *   getActiveDisasters()→ GET /api/admin/teams/active-disasters (wrong)
 *
 * TARGET (real API from OpenAPI spec):
 *   getTeams()          → GET  /emergency-units/
 *   createTeam()        → POST /emergency-units/
 *   deployUnit()        → POST /disasters/{disasterId}/dispatch
 *   decommissionUnit()  → DELETE /emergency-units/{id}
 *   getActiveDisasters()→ GET  /disasters/active
 *
 * ─── What is RED vs GREEN right now ─────────────────────────────────────────
 *   ✅ Happy path shape tests  → pass (fallback returns data)
 *   ❌ Endpoint URL tests      → fail (wrong URLs in service)
 *   ❌ Error handling tests    → fail (service swallows errors, returns success: true)
 *
 * These red tests ARE the TDD implementation checklist.
 * Fix the service → tests go green.
 *
 * Run: npm test -- --watchAll=false --testPathPattern="emergency-teams.service"
 */

import {
  getTeams,
  createTeam,
  deployUnit,
  decommissionUnit,
  getActiveDisasters,
} from '../emergency-teams.service';

// ─── Mock the configured axios instance ──────────────────────────────────────
jest.mock('../../../lib/axios', () => ({
  __esModule: true,
  default: {
    post:   jest.fn(),
    get:    jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockApiClient = require('../../../lib/axios').default;

// ─── Shared fixtures ──────────────────────────────────────────────────────────
// Shape matches what the real API returns (EmergencyTeamAuthResponse / unit shape)
const MOCK_UNIT = {
  id: 'unit_001',
  unit_code: 'F-12',
  unit_name: 'Fire Response Alpha',
  unit_type: 'FIRE_ENGINE',
  department: 'FIRE',
  unit_status: 'AVAILABLE',
  capacity: 4,
  crew_count: 3,
  station_name: 'Tara Street Station',
  commander_name: null,
  total_deployments: 2,
  avg_response_time: null,
  success_rate: null,
};

// Full API response wrapper shape
const MOCK_UNITS_RESPONSE = {
  units: [MOCK_UNIT],
  total_count: 1,
  active_count: 1,
  deployed_count: 0,
  by_department: { FIRE: 1 },
};

const MOCK_DISASTER = {
  id: 'dis_001',
  tracking_id: 'TRK-001',
  type: 'FIRE',
  severity: 'CRITICAL',
  status: 'ACTIVE',
  report_status: 'VERIFIED',
  location: { lat: 53.3498, lon: -6.2603 },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_user_reported: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getTeams()
// ══════════════════════════════════════════════════════════════════════════════
describe('getTeams()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_UNITS_RESPONSE });
      const result = await getTeams();
      expect(result.success).toBe(true);
    });

    it('returns a data property', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_UNITS_RESPONSE });
      const result = await getTeams();
      expect(result).toHaveProperty('data');
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls GET /emergency-units/', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: MOCK_UNITS_RESPONSE });
      await getTeams();
      // ❌ Currently fails — service calls /api/admin/teams
      // ✅ Will pass once service is updated to /emergency-units/
      expect(mockApiClient.get).toHaveBeenCalledWith('/emergency-units/');
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });
      const result = await getTeams();
      // ❌ Currently fails — service catches error and returns fallback data
      // ✅ Will pass once the fallback is replaced with proper error handling
      expect(result.success).toBe(false);
    });

    it('returns success: false on 500 server error', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });
      const result = await getTeams();
      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));
      const result = await getTeams();
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// createTeam()
// Current type: CreateTeamPayload { teamName, teamType, leaderName, ... }
// Target API:   CreateUnitRequest { unit_code, unit_name, unit_type, department, station_name }
// ══════════════════════════════════════════════════════════════════════════════
describe('createTeam()', () => {
  // Using current CreateTeamPayload shape
  const currentPayload = {
    teamName: 'Fire Response Beta',
    teamType: 'Fire',
    leaderName: 'John Doe',
    leaderEmail: 'john@drs.ie',
    numberOfMembers: 4,
    location: 'Dolphins Barn Station',
    crewMembers: [],
  };

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true when API call succeeds', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_UNIT });
      const result = await createTeam(currentPayload);
      expect(result.success).toBe(true);
    });

    it('returns a data property on success', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_UNIT });
      const result = await createTeam(currentPayload);
      expect(result).toHaveProperty('data');
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls POST /emergency-units/', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_UNIT });
      await createTeam(currentPayload);
      // ❌ Currently fails — service calls /api/admin/teams
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/emergency-units/',
        expect.any(Object)
      );
    });

    it('sends unit_code, unit_name, unit_type, department, station_name in request body', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: MOCK_UNIT });
      await createTeam(currentPayload);
      // ❌ Currently fails — service sends frontend field names not API field names
      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).toMatchObject({
        unit_code: expect.any(String),
        unit_name: expect.any(String),
        unit_type: expect.any(String),
        department: expect.any(String),
        station_name: expect.any(String),
      });
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false on 400 duplicate unit_code', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Unit code already exists' } },
      });
      const result = await createTeam(currentPayload);
      // ❌ Currently fails — service catches error and returns fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });
      const result = await createTeam(currentPayload);
      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));
      const result = await createTeam(currentPayload);
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deployUnit()
// Current type: DeployUnitPayload { unitId, disasterId, priority, notes? }
// Target API:   POST /disasters/{disasterId}/dispatch { unit_ids, priority_level, special_instructions }
// ══════════════════════════════════════════════════════════════════════════════
describe('deployUnit()', () => {
  // Using current DeployUnitPayload shape
  const deployPayload = {
    unitId: 'unit_001',
    disasterId: 'dis_001',
    priority: 'emergency' as const,
    notes: 'Approach from north side',
  };

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true on dispatch', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Units dispatched' } });
      const result = await deployUnit(deployPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls POST /disasters/{disasterId}/dispatch', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Units dispatched' } });
      await deployUnit(deployPayload);
      // ❌ Currently fails — service calls /api/admin/teams/unit_001/deploy
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/disasters/${deployPayload.disasterId}/dispatch`,
        expect.any(Object)
      );
    });

    it('sends unit_ids as an array in the request body', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      await deployUnit(deployPayload);
      // ❌ Currently fails — service does not send unit_ids array
      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).toHaveProperty('unit_ids');
      expect(Array.isArray(body.unit_ids)).toBe(true);
      expect(body.unit_ids).toContain('unit_001');
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false when unit is already deployed', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Unit is already deployed' } },
      });
      const result = await deployUnit(deployPayload);
      // ❌ Currently fails — service catches and returns fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false when disaster not found (404)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Disaster not found' } },
      });
      const result = await deployUnit({ ...deployPayload, disasterId: 'bad_id' });
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// decommissionUnit()
// Current: POST /api/admin/teams/{id}/decommission
// Target:  DELETE /emergency-units/{id}
// ══════════════════════════════════════════════════════════════════════════════
describe('decommissionUnit()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true on decommission', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      mockApiClient.delete.mockResolvedValueOnce({ data: {} });
      const result = await decommissionUnit('unit_001', 'End of service life');
      expect(result.success).toBe(true);
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls DELETE /emergency-units/{id}', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ data: {} });
      mockApiClient.post.mockResolvedValueOnce({ data: {} });
      await decommissionUnit('unit_001', 'End of service life');
      // ❌ Currently fails — service calls POST /api/admin/teams/unit_001/decommission
      expect(mockApiClient.delete).toHaveBeenCalledWith('/emergency-units/unit_001', expect.objectContaining({ data: expect.objectContaining({ reason: 'End of service life' }) }));
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false when unit is currently deployed', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Cannot decommission unit while DEPLOYED' } },
      });
      mockApiClient.delete.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Cannot decommission unit while DEPLOYED' } },
      });
      const result = await decommissionUnit('unit_001', 'reason');
      // ❌ Currently fails — service catches and returns fallback
      expect(result.success).toBe(false);
    });

    it('returns success: false on 404 unit not found', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Unit not found' } },
      });
      mockApiClient.delete.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Unit not found' } },
      });
      const result = await decommissionUnit('nonexistent', 'reason');
      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getActiveDisasters()
// Current: GET /api/admin/teams/active-disasters
// Target:  GET /disasters/active
// ══════════════════════════════════════════════════════════════════════════════
describe('getActiveDisasters()', () => {

  describe('return shape — passes now, must still pass after integration', () => {
    it('returns success: true', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      const result = await getActiveDisasters();
      expect(result.success).toBe(true);
    });

    it('returns a data property', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      const result = await getActiveDisasters();
      expect(result).toHaveProperty('data');
    });
  });

  describe('endpoint — RED until service uses correct URL', () => {
    it('calls GET /disasters/all (filtered locally for ACTIVE + MONITORING)', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [MOCK_DISASTER] });
      await getActiveDisasters();
      // ❌ Currently fails — service calls /api/admin/teams/active-disasters
      expect(mockApiClient.get).toHaveBeenCalledWith('/disasters/all');
    });
  });

  describe('error handling — RED until fallback is removed', () => {
    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Emergency team access required' } },
      });
      const result = await getActiveDisasters();
      // ❌ Currently fails — service catches and returns fallback data
      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));
      const result = await getActiveDisasters();
      expect(result.success).toBe(false);
    });
  });
});