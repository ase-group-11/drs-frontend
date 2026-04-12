
jest.mock('@services/disasterService', () => ({ disasterService:{ getReport:jest.fn() } }));
import { disasterService } from '@services/disasterService';
const mockGetReport = disasterService.getReport as jest.Mock;
const makeReport = (o={}) => ({ id:'r001', disaster_type:'fire', severity:'high', description:'Fire on main st', location_address:'Dublin', latitude:53.35, longitude:-6.26, people_affected:10, report_status:'pending', rejection_reason:null, created_at:'2024-01-01T00:00:00Z', photo_count:2, ...o });
beforeEach(() => jest.clearAllMocks());
describe('ReportDetailScreen service', () => {
  it('getReport resolves with data', async () => {
    mockGetReport.mockResolvedValue(makeReport());
    const r = await disasterService.getReport('r001') as any;
    expect(r.id).toBe('r001');
    expect(r.location_address).toBe('Dublin');
  });
  it('getReport called with correct id', async () => {
    mockGetReport.mockResolvedValue(makeReport());
    await disasterService.getReport('specific-id');
    expect(mockGetReport).toHaveBeenCalledWith('specific-id');
  });
  it('getReport rejects on error', async () => {
    mockGetReport.mockRejectedValue(new Error('Not found'));
    await expect(disasterService.getReport('bad')).rejects.toThrow('Not found');
  });
  it('status pending is valid', async () => {
    mockGetReport.mockResolvedValue(makeReport({ report_status:'pending' }));
    const r = await disasterService.getReport('r001') as any;
    expect(r.report_status).toBe('pending');
  });
  it('status verified is valid', async () => {
    mockGetReport.mockResolvedValue(makeReport({ report_status:'verified' }));
    const r = await disasterService.getReport('r001') as any;
    expect(r.report_status).toBe('verified');
  });
  it('rejection reason returned when rejected', async () => {
    mockGetReport.mockResolvedValue(makeReport({ report_status:'rejected', rejection_reason:'Duplicate' }));
    const r = await disasterService.getReport('r001') as any;
    expect(r.rejection_reason).toBe('Duplicate');
  });
});
