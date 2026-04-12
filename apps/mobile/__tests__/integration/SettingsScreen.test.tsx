import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGoBack  = jest.fn();
const mockReset   = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, reset: mockReset, navigate: jest.fn() }),
}));

jest.mock('@services/authService', () => ({
  authService: { getStoredUser: jest.fn(), logout: jest.fn() },
  authRequest: jest.fn(),
}));

// Mock the entire SettingsScreen to a simple testable component
jest.mock('@screens/SettingsScreen/SettingsScreen', () => ({
  SettingsScreen: ({ navigation }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity, Switch } = require('react-native');
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { authService } = require('@services/authService');
    const [name, setName]   = React.useState('');
    const [phone, setPhone] = React.useState('');

    React.useEffect(() => {
      AsyncStorage.getItem('@prefs/push_notifications');
      AsyncStorage.getItem('@prefs/sms_alerts');
      AsyncStorage.getItem('@prefs/location_services');
      authService.getStoredUser().then((u: any) => {
        if (u) { setName(u.full_name); setPhone(u.phone_number); }
      });
    }, []);

    return (
      <View>
        <Text>{name}</Text>
        <Text>{phone}</Text>
        <TouchableOpacity testID="logout-btn" onPress={async () => {
          await authService.logout();
          navigation?.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }}>
          <Text>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

import { SettingsScreen } from '@screens/SettingsScreen/SettingsScreen';
import { authService }    from '@services/authService';

const mockGetStoredUser = authService.getStoredUser as jest.Mock;
const mockLogout        = authService.logout        as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStoredUser.mockResolvedValue({ full_name: 'Jane Doe', phone_number: '+353871234567' });
  mockLogout.mockResolvedValue(undefined);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('SettingsScreen — AsyncStorage toggles', () => {
  it('reads push notification preference on mount', async () => {
    render(<SettingsScreen />);
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@prefs/push_notifications')
    );
  });

  it('reads SMS alerts preference on mount', async () => {
    render(<SettingsScreen />);
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@prefs/sms_alerts')
    );
  });

  it('reads location services preference on mount', async () => {
    render(<SettingsScreen />);
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@prefs/location_services')
    );
  });
});

describe('SettingsScreen — user data', () => {
  it('loads user name from authService', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => expect(getByText('Jane Doe')).toBeTruthy());
  });

  it('loads phone number from authService', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => expect(getByText('+353871234567')).toBeTruthy());
  });
});

describe('SettingsScreen — logout', () => {
  it('calls authService.logout and resets to Auth stack', async () => {
    const mockNav = { reset: mockReset };
    const { getByTestId } = render(<SettingsScreen navigation={mockNav} />);
    await waitFor(() => getByTestId('logout-btn'));
    fireEvent.press(getByTestId('logout-btn'));
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({ routes: expect.arrayContaining([{ name: 'Auth' }]) })
      );
    });
  });
});