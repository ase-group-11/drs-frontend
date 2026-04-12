
jest.mock('../authService', () => ({
  authService: {},
  authRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(m, s) { super(m); this.name='ApiError'; this.status=s; }
  },
}));
import { disasterService } from '../disasterService';
const { authRequest, ApiError } = require('../authService');
const BASE = { user_id:'u1', location_address:'Dublin', disaster_type:'FIRE', severity:'HIGH', description:'Test', latitude:53.3, longitude:-6.2 };
beforeEach(() => jest.clearAllMocks());
describe('disasterService', () => {
  it('createReport calls authRequest', async () => {
    authRequest.mockResolvedValueOnce({ id:'r3', status:'pending' });
    const r = await disasterService.createReport(BASE);
    expect(authRequest).toHaveBeenCalledWith('/disaster-reports/', expect.objectContaining({ method:'POST' }));
    expect(r.id).toBe('r3');
  });
  it('getUserReports returns reports', async () => {
    authRequest.mockResolvedValueOnce({ reports:[{ id:'r1', disaster_type:'FIRE' }], count:1, user_id:'u1' });
    const r = await disasterService.getUserReports('u1');
    expect(r.reports[0].disaster_type).toBe('FIRE');
  });
  it('getMyReports returns array', async () => {
    authRequest.mockResolvedValueOnce({ reports:[{ id:'r2', disaster_type:'FLOOD' }], count:1, user_id:'u1' });
    const r = await disasterService.getMyReports('u1');
    expect(Array.isArray(r)).toBe(true);
  });
  it('getReport returns report', async () => {
    authRequest.mockResolvedValueOnce({ id:'r5' });
    const r = await disasterService.getReport('r5');
    expect(r.id).toBe('r5');
  });
});
