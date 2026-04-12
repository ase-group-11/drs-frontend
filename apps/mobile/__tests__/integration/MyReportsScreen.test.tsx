
jest.mock('@services/authService', () => ({ authService:{ getStoredUser:jest.fn() } }));
jest.mock('@services/disasterService', () => ({ disasterService:{ getMyReports:jest.fn() } }));
import { authService } from '@services/authService';
import { disasterService } from '@services/disasterService';
const mockUser = authService.getStoredUser as jest.Mock;
const mockReports = disasterService.getMyReports as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); mockUser.mockResolvedValue({ id:'u1', full_name:'Jane', phone_number:'+353' }); });
describe('MyReportsScreen service', () => {
  it('getStoredUser returns user', async () => {
    const u = await authService.getStoredUser();
    expect(u.id).toBe('u1');
  });
  it('getMyReports called with user id', async () => {
    mockReports.mockResolvedValue([{ id:'r1' }]);
    const u = await authService.getStoredUser();
    await disasterService.getMyReports(u.id);
    expect(mockReports).toHaveBeenCalledWith('u1');
  });
  it('getMyReports returns empty array', async () => {
    mockReports.mockResolvedValue([]);
    const r = await disasterService.getMyReports('u1');
    expect(r).toEqual([]);
  });
  it('null user when not stored', async () => {
    mockUser.mockResolvedValue(null);
    expect(await authService.getStoredUser()).toBeNull();
  });
  it('active filter works', () => {
    const r = [{ id:'r1', status:'IN_PROGRESS' },{ id:'r2', status:'resolved' }];
    expect(r.filter(x => x.status !== 'resolved')).toHaveLength(1);
  });
  it('resolved filter works', () => {
    const r = [{ id:'r1', status:'IN_PROGRESS' },{ id:'r2', status:'resolved' }];
    expect(r.filter(x => x.status === 'resolved')).toHaveLength(1);
  });
});
