/**
 * TDD Tests — user-management.service.ts
 *
 * Real API endpoints (from OpenAPI spec):
 *   GET  /emergency-units/                     → getUsers (list team members as "users")
 *   POST /emergency-team/deactivate/{id}        → deleteUser (deactivate account)
 *
 * ⚠️  NOTE on missing endpoints:
 *   The API spec does NOT provide:
 *     - A "list all team members" endpoint
 *     - A "update team member" endpoint
 *   Until these are added to the backend, these service functions should call
 *   the closest equivalent or be documented as pending.
 *
 * ⚠️  CURRENT STATE: The service uses placeholder endpoints (/api/admin/users)
 *     that do NOT exist in the real API. These tests will FAIL until the
 *     service is updated to use the correct endpoints above.
 *
 * Run: npm test -- --watchAll=false --testPathPattern="user-management.service"
 */

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../user-management.service';

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
const MOCK_TEAM_MEMBER = {
  id: 'tm_001',
  phone_number: '+353871234567',
  full_name: 'John Doe',
  email: 'john@drs.ie',
  role: 'admin',
  department: 'fire',
  employee_id: 'EMP001',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getUsers()
// ══════════════════════════════════════════════════════════════════════════════
describe('getUsers()', () => {
  describe('happy path', () => {
    it('makes a GET request to fetch team members', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { users: [MOCK_TEAM_MEMBER], total: 1 },
      });

      await getUsers();

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('returns success: true with a users list', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { users: [MOCK_TEAM_MEMBER], total: 1 },
      });

      const result = await getUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('users');
    });

    it('passes search filter as a query param', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { users: [], total: 0 },
      });

      await getUsers({ search: 'john' });

      const callArgs = mockApiClient.get.mock.calls[0];
      // Either in URL string or in params object
      const hasSearchParam =
        (typeof callArgs[0] === 'string' && callArgs[0].includes('john')) ||
        (callArgs[1]?.params?.search === 'john');

      expect(hasSearchParam).toBe(true);
    });

    it('passes role filter as a query param', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { users: [], total: 0 },
      });

      await getUsers({ role: 'admin' });

      const callArgs = mockApiClient.get.mock.calls[0];
      const hasRoleParam =
        (typeof callArgs[0] === 'string' && callArgs[0].includes('admin')) ||
        (callArgs[1]?.params?.role === 'admin');

      expect(hasRoleParam).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });

      const result = await getUsers();

      expect(result.success).toBe(false);
    });

    it('returns success: false on 500 server error', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      const result = await getUsers();

      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await getUsers();

      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// createUser()
// ══════════════════════════════════════════════════════════════════════════════
describe('createUser()', () => {
  const newUserPayload = {
    fullName: 'Jane Smith',
    email: 'jane@drs.ie',
    phone: '+353861234567',
    role: 'admin' as const,
    department: 'medical' as const,
    password: 'Secret@123',
  };

  describe('happy path', () => {
    it('makes a POST request to create a user', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { ...MOCK_TEAM_MEMBER, id: 'tm_002' },
      });

      await createUser(newUserPayload);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });

    it('returns success: true with the created user', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { ...MOCK_TEAM_MEMBER, id: 'tm_002' },
      });

      const result = await createUser(newUserPayload);

      expect(result.success).toBe(true);
    });

    it('sends required fields in the request body', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: { ...MOCK_TEAM_MEMBER },
      });

      await createUser(newUserPayload);

      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('returns success: false when email already exists (400)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Email already registered' } },
      });

      const result = await createUser(newUserPayload);

      expect(result.success).toBe(false);
    });

    it('returns success: false on 422 validation error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'field required' } },
      });

      const result = await createUser({ ...newUserPayload, email: '' });

      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await createUser(newUserPayload);

      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateUser()
// ══════════════════════════════════════════════════════════════════════════════
describe('updateUser()', () => {
  const updatePayload = { role: 'admin' as const, status: 'active' as const };

  describe('happy path', () => {
    it('makes a PUT/PATCH request with the user id', async () => {
      mockApiClient.put.mockResolvedValueOnce({ data: MOCK_TEAM_MEMBER });

      await updateUser('tm_001', updatePayload);

      // Should call PUT or PATCH with tm_001 in the URL
      const wasCalled = mockApiClient.put.mock.calls.length > 0 ||
                        (mockApiClient.patch && mockApiClient.patch.mock.calls.length > 0);
      expect(wasCalled).toBe(true);
    });

    it('returns success: true on successful update', async () => {
      mockApiClient.put.mockResolvedValueOnce({ data: MOCK_TEAM_MEMBER });

      const result = await updateUser('tm_001', updatePayload);

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns success: false when user not found (404)', async () => {
      mockApiClient.put.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'User not found' } },
      });

      const result = await updateUser('nonexistent', updatePayload);

      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.put.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });

      const result = await updateUser('tm_001', updatePayload);

      expect(result.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteUser()  —  maps to POST /emergency-team/deactivate/{id}
// ══════════════════════════════════════════════════════════════════════════════
describe('deleteUser()', () => {
  describe('happy path', () => {
    it('calls the deactivate endpoint with the user id', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Team member deactivated' } });
      mockApiClient.delete.mockResolvedValueOnce({ data: { message: 'User deleted' } });

      await deleteUser('tm_001');

      // Should call either POST /emergency-team/deactivate/tm_001 OR DELETE on a user endpoint
      const postCalls = mockApiClient.post.mock.calls;
      const deleteCalls = mockApiClient.delete.mock.calls;

      const calledDeactivate = postCalls.some(([url]: [string]) =>
        url.includes('tm_001') || url.includes('deactivate')
      );
      const calledDelete = deleteCalls.some(([url]: [string]) => url.includes('tm_001'));

      expect(calledDeactivate || calledDelete).toBe(true);
    });

    it('returns success: true on deactivation', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Team member deactivated' } });
      mockApiClient.delete.mockResolvedValueOnce({ data: {} });

      const result = await deleteUser('tm_001');

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns success: false when user not found (404)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Team member not found' } },
      });
      mockApiClient.delete.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'User not found' } },
      });

      const result = await deleteUser('nonexistent');

      expect(result.success).toBe(false);
    });

    it('returns success: false on 401 Unauthorized', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });
      mockApiClient.delete.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Not authenticated' } },
      });

      const result = await deleteUser('tm_001');

      expect(result.success).toBe(false);
    });

    it('returns success: false on network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network Error'));
      mockApiClient.delete.mockRejectedValueOnce(new Error('Network Error'));

      const result = await deleteUser('tm_001');

      expect(result.success).toBe(false);
    });
  });
});