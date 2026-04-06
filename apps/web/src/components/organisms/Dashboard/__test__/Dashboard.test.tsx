import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';

// ─── Mock recharts ResponsiveContainer ───────────────────────────────────────
// recharts' ResponsiveContainer uses a ResizeObserver internally.
// jsdom does not implement ResizeObserver properly, causing
// "observer.observe is not a function" in async waitFor blocks.
// Replace ResponsiveContainer with a simple passthrough so charts render
// without triggering the observer.
jest.mock('recharts', () => {
  const Real = jest.requireActual('recharts');
  const ResponsiveContainer = ({ children, height }: any) => (
    <div style={{ width: 800, height: height || 300 }}>{children}</div>
  );
  return { ...Real, ResponsiveContainer };
});

jest.mock('../../../../lib/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('../../../../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    connected: false,
    unreadCount: 0,
    scrollToId: null,
    setScrollToId: jest.fn(),
  }),
}));

const mockApiClient = require('../../../../lib/axios').default as { get: jest.Mock };

import Dashboard from '../Dashboard';

const NOW = new Date().toISOString();

const MOCK_DISASTERS = {
  disasters: [{
    id: 'dis_001', tracking_id: 'DRS-001', type: 'FIRE', severity: 'HIGH',
    disaster_status: 'ACTIVE', report_status: 'VERIFIED',
    location: { lat: 53.3, lon: -6.2 }, location_address: 'Dublin',
    description: 'Fire', created_at: NOW, updated_at: NOW,
    units_assigned: 2, deployed_units: [], people_affected: 10, report_count: 1, time_ago: '5m',
  }],
  summary: { total: 1, active: 1, critical: 0, resolved: 0 },
};

const MOCK_UNITS = { units: [{ unit_status: 'AVAILABLE' }], total_count: 1, active_count: 1 };
const MOCK_USERS = { users: [{ created_at: NOW }], total_count: 1, summary: { active: 1 } };

function setupMocks() {
  mockApiClient.get
    .mockResolvedValueOnce({ data: MOCK_DISASTERS })
    .mockResolvedValueOnce({ data: MOCK_UNITS })
    .mockResolvedValueOnce({ data: MOCK_USERS });
}

function renderDashboard() {
  return render(
    <ConfigProvider><AntApp><MemoryRouter><Dashboard /></MemoryRouter></AntApp></ConfigProvider>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Dashboard — loading', () => {
  it('shows a spinner before data arrives', () => {
    mockApiClient.get.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});

describe('Dashboard — data render', () => {
  it('removes the spinner after all data loads', async () => {
    setupMocks();
    renderDashboard();
    await waitFor(() =>
      expect(document.querySelector('.ant-spin-spinning')).not.toBeInTheDocument()
    );
  });

  it('makes exactly 3 API calls on mount', async () => {
    setupMocks();
    renderDashboard();
    await waitFor(() => expect(mockApiClient.get).toHaveBeenCalledTimes(3));
  });

  it('calls the disasters endpoint', async () => {
    setupMocks();
    renderDashboard();
    await waitFor(() => {
      const urls = mockApiClient.get.mock.calls.map((c: any[]) => c[0] as string);
      expect(urls.some(u => u.includes('disasters'))).toBe(true);
    });
  });

  it('calls the emergency-units endpoint', async () => {
    setupMocks();
    renderDashboard();
    await waitFor(() => {
      const urls = mockApiClient.get.mock.calls.map((c: any[]) => c[0] as string);
      expect(urls.some(u => u.includes('emergency-units'))).toBe(true);
    });
  });

  it('calls the users endpoint', async () => {
    setupMocks();
    renderDashboard();
    await waitFor(() => {
      const urls = mockApiClient.get.mock.calls.map((c: any[]) => c[0] as string);
      expect(urls.some(u => u.includes('users'))).toBe(true);
    });
  });
});

describe('Dashboard — error handling', () => {
  it('clears the spinner when all API calls fail', async () => {
    mockApiClient.get.mockRejectedValue(new Error('Network Error'));
    renderDashboard();
    await waitFor(() =>
      expect(document.querySelector('.ant-spin-spinning')).not.toBeInTheDocument()
    );
  });

  it('does not crash when one of three API calls fails', async () => {
    mockApiClient.get
      .mockRejectedValueOnce(new Error('Disasters failed'))
      .mockResolvedValueOnce({ data: MOCK_UNITS })
      .mockResolvedValueOnce({ data: MOCK_USERS });
    renderDashboard();
    await waitFor(() =>
      expect(document.querySelector('.ant-spin-spinning')).not.toBeInTheDocument()
    );
  });
});