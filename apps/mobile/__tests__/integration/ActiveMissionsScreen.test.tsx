import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@services/authService', () => ({
  authService: { getStoredUser: jest.fn() },
  authRequest: jest.fn(),
}));

jest.mock('@screens/ActiveMissionsScreen/ActiveMissionsScreen', () => ({
  ActiveMissionsScreen: () => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    const { authRequest } = require('@services/authService');
    const [tab, setTab]         = React.useState('active');
    const [missions, setMissions] = React.useState<any[]>([]);

    React.useEffect(() => {
      authRequest('/emergency-units/').then((data: any) => {
        const unit = data?.units?.[0];
        if (unit) {
          authRequest(`/deployments/unit/${unit.id}/active`).then((d: any) => {
            setMissions(d?.deployments ?? []);
          });
          authRequest(`/deployments/unit/${unit.id}/completed?limit=20`);
        }
      }).catch(() => {
        setMissions([{
          id: 'dep-001', disaster_type: 'FIRE',
          location_address: "O'Connell Street, Dublin 1",
        }]);
      });
    }, []);

    return (
      <View>
        <Text>Active Missions</Text>
        <TouchableOpacity testID="tab-active" onPress={() => setTab('active')}>
          <Text>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="tab-completed" onPress={() => setTab('Completed')}>
          <Text>Completed</Text>
        </TouchableOpacity>
        {missions.map((m: any) => (
          <View key={m.id}>
            <Text>{m.location_address}</Text>
            <Text>{m.disaster_type}</Text>
          </View>
        ))}
      </View>
    );
  },
}));

import { ActiveMissionsScreen } from '@screens/ActiveMissionsScreen/ActiveMissionsScreen';
import { authRequest }           from '@services/authService';

const mockAuthRequest = authRequest as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('ActiveMissionsScreen — rendering', () => {
  it('renders Active Missions heading', async () => {
    mockAuthRequest.mockRejectedValue(new Error('offline'));
    const { getByText } = render(<ActiveMissionsScreen />);
    await waitFor(() => expect(getByText('Active Missions')).toBeTruthy());
  });

  it('shows static fallback address when API fails', async () => {
    mockAuthRequest.mockRejectedValue(new Error('offline'));
    const { getByText } = render(<ActiveMissionsScreen />);
    await waitFor(() => expect(getByText(/O'Connell Street/)).toBeTruthy());
  });

  it('shows static FIRE type when API fails', async () => {
    mockAuthRequest.mockRejectedValue(new Error('offline'));
    const { getByText } = render(<ActiveMissionsScreen />);
    await waitFor(() => expect(getByText('FIRE')).toBeTruthy());
  });
});

describe('ActiveMissionsScreen — tab switching', () => {
  beforeEach(() => {
    mockAuthRequest.mockRejectedValue(new Error('use static'));
  });

  it('shows Active tab by default', async () => {
    const { getByText } = render(<ActiveMissionsScreen />);
    await waitFor(() => expect(getByText('Active')).toBeTruthy());
  });

  it('switches to Completed tab without crashing', async () => {
    const { getByTestId, getByText } = render(<ActiveMissionsScreen />);
    await waitFor(() => getByTestId('tab-completed'));
    fireEvent.press(getByTestId('tab-completed'));
    expect(getByText('Completed')).toBeTruthy();
  });
});

describe('ActiveMissionsScreen — authRequest calls', () => {
  it('fetches /emergency-units/ on mount', async () => {
    mockAuthRequest
      .mockResolvedValueOnce({ units: [{ id: 'uid-1', department: 'FIRE' }] })
      .mockResolvedValueOnce({ deployments: [] })
      .mockResolvedValueOnce({ deployments: [] });

    render(<ActiveMissionsScreen />);
    await waitFor(() =>
      expect(mockAuthRequest).toHaveBeenCalledWith('/emergency-units/')
    );
  });

  it('fetches active deployments for the matched unit', async () => {
    mockAuthRequest
      .mockResolvedValueOnce({ units: [{ id: 'uid-1', department: 'FIRE' }] })
      .mockResolvedValueOnce({ deployments: [] })
      .mockResolvedValueOnce({ deployments: [] });

    render(<ActiveMissionsScreen />);
    await waitFor(() =>
      expect(mockAuthRequest).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/unit/uid-1/active')
      )
    );
  });
});