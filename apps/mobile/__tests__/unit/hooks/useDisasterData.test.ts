import { renderHook, act } from '@testing-library/react-native';
import { useDisasterData } from '@hooks/useDisasterData';

jest.mock('@services/disasterService', () => ({
  disasterService: {
    getActiveDisasters: jest.fn(),
    getAlerts: jest.fn(),
    getMyReports: jest.fn(),
  },
}));

import { disasterService } from '@services/disasterService';

const mockDisasters = [{ id: 'd1', type: 'fire', severity: 'high', title: 'Fire',
  location: { latitude: 53.35, longitude: -6.26, address: 'Dublin' }, reportedAt: new Date(), status: 'active' }];
const mockAlerts = [{ id: 'a1', type: 'warning', severity: 'medium', title: 'Warning',
  disasterType: 'flood', location: { latitude: 53.34, longitude: -6.25, name: 'Dublin' },
  distance: '1 km', message: 'Alert', issuedAt: new Date(), isRead: false }];
const mockReports = [{ id: 'r1' }];

describe('useDisasterData — success', () => {
  beforeEach(() => {
    (disasterService.getActiveDisasters as jest.Mock).mockResolvedValue(mockDisasters);
    (disasterService.getAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue(mockReports);
  });

  it('starts with empty disasters array', () => {
    const { result } = renderHook(() => useDisasterData());
    expect(result.current.disasters).toEqual([]);
  });

  it('populates disasters after fetch resolves', async () => {
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.disasters).toEqual(mockDisasters);
    expect(result.current.isLoading).toBe(false);
  });

  it('populates alerts after fetch resolves', async () => {
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.alerts).toEqual(mockAlerts);
  });

  it('populates reports after fetch resolves', async () => {
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.reports).toEqual(mockReports);
  });
});

describe('useDisasterData — error', () => {
  beforeEach(() => {
    (disasterService.getActiveDisasters as jest.Mock).mockRejectedValue(new Error('Timed out'));
    (disasterService.getAlerts as jest.Mock).mockResolvedValue([]);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue([]);
  });

  it('sets error when fetch fails', async () => {
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.error).toBe('Timed out');
  });

  it('keeps disasters empty on error', async () => {
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.disasters).toEqual([]);
  });
});

describe('useDisasterData — refresh', () => {
  it('re-fetches when refresh() called', async () => {
    (disasterService.getActiveDisasters as jest.Mock).mockResolvedValue(mockDisasters);
    (disasterService.getAlerts as jest.Mock).mockResolvedValue([]);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue([]);
    const { result } = renderHook(() => useDisasterData());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    await act(async () => { result.current.refresh(); await new Promise(r => setTimeout(r, 0)); });
    expect(disasterService.getActiveDisasters).toHaveBeenCalled();
  });
});
