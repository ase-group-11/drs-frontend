/**
 * UNIT TESTS — src/hooks/useDisasterData.ts
 *
 * Tests loading state, successful data fetch, and error handling.
 * disasterService is mocked so no real API calls are made.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useDisasterData } from '@hooks/useDisasterData';

// Mock the entire disasterService
jest.mock('@services/disasterService', () => ({
  disasterService: {
    getActiveDisasters: jest.fn(),
    getAlerts: jest.fn(),
    getMyReports: jest.fn(),
  },
}));

import { disasterService } from '@services/disasterService';

const mockDisasters = [
  {
    id: 'd1', type: 'fire', severity: 'high', title: 'Fire - High',
    location: { latitude: 53.35, longitude: -6.26, address: 'Dublin' },
    reportedAt: new Date(), status: 'active',
  },
];

const mockAlerts = [
  {
    id: 'a1', type: 'warning', severity: 'medium', title: 'Warning',
    disasterType: 'flood', location: { latitude: 53.34, longitude: -6.25, name: 'Dublin' },
    distance: '1 km', message: 'Flood alert', issuedAt: new Date(), isRead: false,
  },
];

const mockReports = [{ id: 'r1', reportNumber: 'RPT001', status: 'in_progress' }];

describe('useDisasterData — success', () => {
  beforeEach(() => {
    (disasterService.getActiveDisasters as jest.Mock).mockResolvedValue(mockDisasters);
    (disasterService.getAlerts as jest.Mock).mockResolvedValue(mockAlerts);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue(mockReports);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useDisasterData());
    expect(result.current.isLoading).toBe(true);
  });

  it('populates disasters after fetch resolves', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();
    expect(result.current.disasters).toEqual(mockDisasters);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('populates alerts after fetch resolves', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();
    expect(result.current.alerts).toEqual(mockAlerts);
  });

  it('populates reports after fetch resolves', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();
    expect(result.current.reports).toEqual(mockReports);
  });
});

describe('useDisasterData — error', () => {
  beforeEach(() => {
    (disasterService.getActiveDisasters as jest.Mock).mockRejectedValue(
      new Error('Request timed out.')
    );
    (disasterService.getAlerts as jest.Mock).mockResolvedValue([]);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue([]);
  });

  it('sets error message when fetch fails', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();
    expect(result.current.error).toBe('Request timed out.');
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps disasters array empty on error', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();
    expect(result.current.disasters).toEqual([]);
  });
});

describe('useDisasterData — refresh', () => {
  it('re-fetches data when refresh() is called', async () => {
    (disasterService.getActiveDisasters as jest.Mock).mockResolvedValue(mockDisasters);
    (disasterService.getAlerts as jest.Mock).mockResolvedValue([]);
    (disasterService.getMyReports as jest.Mock).mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useDisasterData());
    await waitForNextUpdate();

    const updatedDisasters = [...mockDisasters, { ...mockDisasters[0], id: 'd2' }];
    (disasterService.getActiveDisasters as jest.Mock).mockResolvedValue(updatedDisasters);

    act(() => { result.current.refresh(); });
    await waitForNextUpdate();

    expect(result.current.disasters).toHaveLength(2);
    expect(disasterService.getActiveDisasters).toHaveBeenCalledTimes(2);
  });
});