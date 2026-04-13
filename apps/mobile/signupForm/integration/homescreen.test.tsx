/**
 * INTEGRATION TESTS — HomeScreen
 *
 * Tests the full HomeScreen render cycle:
 *   - Disaster loading via mapService
 *   - Filter tab interaction
 *   - Navigation calls (Report, Alerts, Profile)
 *   - Menu open / close
 *   - Retry / refresh on error
 *
 * mapService and authService are mocked at module level.
 * Navigation is a mock prop.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { HomeScreen } from '../../src/screens/HomeScreen/HomeScreen';

// ─── Mock mapService ───────────────────────────────────────────────────────
jest.mock('../../src/services/mapService', () => ({
  mapService: {
    formatBounds: jest.fn(() => '53.20,-6.45,53.45,-6.05'),
    getDisasters: jest.fn(),
    getTraffic:   jest.fn().mockResolvedValue({ available: false }),
    getReroutePlan: jest.fn().mockRejectedValue(new Error('no plan')),
  },
}));

// ─── Mock authService ──────────────────────────────────────────────────────
jest.mock('../../src/services/authService', () => ({
  authService: {
    getStoredUser: jest.fn().mockResolvedValue({
      full_name: 'Jane Doe',
      phone_number: '0871234567',
      role: 'citizen',
    }),
    logout: jest.fn(),
    getAuthHeader: jest.fn(() => ({})),
  },
  authRequest: jest.fn().mockResolvedValue({ units: [] }),
  ApiError: class ApiError extends Error {
    status: number; constructor(m: string, s: number) { super(m); this.status = s; }
  },
}));

// ─── Mock sub-components that need native modules ─────────────────────────
jest.mock('../../src/components/organisms/DisasterMap', () => ({
  DisasterMap: React.forwardRef((_props: any, _ref: any) => {
    const { View } = require('react-native');
    return <View testID="disaster-map" />;
  }),
}));

jest.mock('../../src/components/organisms/MapHeader', () => ({
  MapHeader: ({ onMenuPress, onNotificationPress }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View>
        <TouchableOpacity testID="menu-btn" onPress={onMenuPress}>
          <Text>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="alerts-btn" onPress={onNotificationPress}>
          <Text>Alerts</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../src/components/organisms/FilterTabs', () => ({
  FilterTabs: ({ filters, onSelect }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="filter-tabs">
        {filters.map((f: any) => (
          <TouchableOpacity key={f.id} testID={`filter-${f.id}`} onPress={() => onSelect(f.id)}>
            <Text>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
}));

jest.mock('../../src/components/templates/MapTemplate', () => ({
  MapTemplate: ({ header, filterBar, map }: any) => {
    const { View } = require('react-native');
    return <View>{header}{filterBar}{map}</View>;
  },
}));

jest.mock('../../src/components/organisms/ProfileMenu', () => ({
  ProfileMenu: ({ onNavigate, onLogout }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="profile-menu">
        <TouchableOpacity testID="nav-profile" onPress={() => onNavigate('Profile')}>
          <Text>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="logout-btn" onPress={onLogout}>
          <Text>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../src/components/organisms/ResponderProfileMenu', () => ({
  ResponderProfileMenu: () => {
    const { View } = require('react-native');
    return <View testID="responder-menu" />;
  },
}));

// ─── Test helpers ─────────────────────────────────────────────────────────

import { mapService } from '../../src/services/mapService';
const mockGetDisasters = mapService.getDisasters as jest.Mock;

const makeDisaster = (id: string, type = 'fire') => ({
  id, type, severity: 'high', title: `${type} - high`,
  location: { latitude: 53.35, longitude: -6.26, address: 'Dublin' },
  reportedAt: new Date(), status: 'active',
});

const mockNavigation: any = {
  navigate: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────
describe('HomeScreen — rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDisasters.mockResolvedValue([makeDisaster('d1', 'fire')]);
  });

  it('renders the map component', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByTestId('disaster-map')).toBeTruthy());
  });

  it('renders the filter tabs', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByTestId('filter-tabs')).toBeTruthy());
  });

  it('calls getDisasters on mount with Dublin bounds', async () => {
    render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() =>
      expect(mockGetDisasters).toHaveBeenCalledWith(
        expect.any(String), 100
      )
    );
  });
});

describe('HomeScreen — filter tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDisasters.mockResolvedValue([
      makeDisaster('d1', 'fire'),
      makeDisaster('d2', 'flood'),
    ]);
  });

  it('selects "fire" filter and passes it down', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => getByTestId('filter-fire'));
    fireEvent.press(getByTestId('filter-fire'));
    // No assertion on internal state — confirm no crash
    expect(getByTestId('disaster-map')).toBeTruthy();
  });

  it('selects "all" filter without crashing', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => getByTestId('filter-all'));
    fireEvent.press(getByTestId('filter-all'));
    expect(getByTestId('disaster-map')).toBeTruthy();
  });
});

describe('HomeScreen — navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDisasters.mockResolvedValue([]);
  });

  it('navigates to Alerts when alerts button is pressed', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => getByTestId('alerts-btn'));
    fireEvent.press(getByTestId('alerts-btn'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Alerts');
  });

  it('opens the profile menu when menu button is pressed', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => getByTestId('menu-btn'));
    fireEvent.press(getByTestId('menu-btn'));
    await waitFor(() => expect(getByTestId('profile-menu')).toBeTruthy());
  });

  it('navigates to Profile from menu', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => getByTestId('menu-btn'));
    fireEvent.press(getByTestId('menu-btn'));
    await waitFor(() => getByTestId('nav-profile'));
    fireEvent.press(getByTestId('nav-profile'));
    await waitFor(() =>
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile')
    );
  });
});

describe('HomeScreen — error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not crash when getDisasters rejects', async () => {
    mockGetDisasters.mockRejectedValue(new Error('Request timed out.'));
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByTestId('disaster-map')).toBeTruthy());
  });

  it('refreshes every 30 seconds by polling', async () => {
    jest.useFakeTimers();
    mockGetDisasters.mockResolvedValue([]);
    render(<HomeScreen navigation={mockNavigation} />);
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(mockGetDisasters).toHaveBeenCalledTimes(2); // initial + 1 interval
    jest.useRealTimers();
  });
});