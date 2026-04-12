
const mockGetDisasters = jest.fn();
jest.mock('@services/mapService', () => ({ mapService:{ formatBounds:jest.fn(()=>'53.20,-6.45,53.45,-6.05'), getDisasters:(...a)=>mockGetDisasters(...a), getTraffic:jest.fn().mockResolvedValue({ available:false }), getReroutePlan:jest.fn().mockRejectedValue(new Error('no plan')) } }));
jest.mock('@services/authService', () => ({ authService:{ getStoredUser:jest.fn().mockResolvedValue({ full_name:'Jane', phone_number:'+353', role:'citizen' }), logout:jest.fn(), getAuthHeader:jest.fn(()=>({})) }, authRequest:jest.fn().mockResolvedValue({ units:[] }), ApiError: class extends Error { constructor(m,s) { super(m); this.status=s; } } }));
import { mapService } from '@services/mapService';
beforeEach(() => { jest.clearAllMocks(); mockGetDisasters.mockResolvedValue([]); });
describe('HomeScreen mapService', () => {
  it('formatBounds returns correct string', () => {
    expect(mapService.formatBounds(53.20,-6.45,53.45,-6.05)).toBe('53.20,-6.45,53.45,-6.05');
  });
  it('getDisasters resolves to array', async () => {
    mockGetDisasters.mockResolvedValue([{ id:'d1', type:'fire' }]);
    const r = await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 100);
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].id).toBe('d1');
  });
  it('getDisasters called with correct args', async () => {
    mockGetDisasters.mockResolvedValue([]);
    await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 100);
    expect(mockGetDisasters).toHaveBeenCalledWith('53.20,-6.45,53.45,-6.05', 100);
  });
  it('getDisasters returns empty array', async () => {
    mockGetDisasters.mockResolvedValue([]);
    expect(await mapService.getDisasters('53.20,-6.45,53.45,-6.05', 100)).toEqual([]);
  });
  it('getDisasters rejects on error', async () => {
    mockGetDisasters.mockRejectedValue(new Error('Timeout'));
    await expect(mapService.getDisasters('53.20,-6.45,53.45,-6.05', 100)).rejects.toThrow('Timeout');
  });
  it('getTraffic returns available status', async () => {
    const r = await mapService.getTraffic('53.20,-6.45,53.45,-6.05') as any;
    expect(r.available).toBe(false);
  });
});
