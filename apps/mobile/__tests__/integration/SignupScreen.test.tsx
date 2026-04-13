/**
 * INTEGRATION TESTS — SignupScreen
 *
 * Tests authService.register call, navigation to OTPVerification,
 * error display, and back to Login link.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack   = jest.fn();

jest.mock('@services/authService', () => ({
  authService: { register: jest.fn() },
  formatPhoneForApi: jest.fn((code, phone) => `${code}${phone}`),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(m: string, s: number) { super(m); this.name = 'ApiError'; this.status = s; }
  },
}));

jest.mock('@templates/AuthTemplate', () => ({
  AuthTemplate: ({ children, header }: any) => {
    const { View } = require('react-native');
    return <View>{header}{children}</View>;
  },
}));

jest.mock('@organisms/SignupForm', () => ({
  SignupForm: ({ onSubmit, onLoginPress, isLoading, error }: any) => {
    const { View, TextInput, TouchableOpacity, Text } = require('react-native');
    return (
      <View>
        <TextInput testID="first-name" onChangeText={(v: string) => global.__fn = v} placeholder="First name" />
        <TextInput testID="last-name"  onChangeText={(v: string) => global.__ln = v} placeholder="Last name" />
        <TextInput testID="phone"      onChangeText={(v: string) => global.__ph = v} placeholder="Phone" />
        <TouchableOpacity testID="signup-btn" onPress={() =>
          onSubmit(global.__fn || 'Jane', global.__ln || 'Doe', global.__ph || '0871234567', '+353')
        }>
          <Text>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="login-link" onPress={onLoginPress}>
          <Text>Log In</Text>
        </TouchableOpacity>
        {error ? <Text testID="error-text">{error}</Text> : null}
      </View>
    );
  },
}));

jest.mock('@atoms/Text', () => ({
  Text: ({ children, ...p }: any) => {
    const { Text } = require('react-native');
    return <Text {...p}>{children}</Text>;
  },
}));

import { SignupScreen } from '@screens/SignupScreen/SignupScreen';
import { authService }  from '@services/authService';

const mockRegister = authService.register as jest.Mock;
const mockNavigation: any = { navigate: mockNavigate, goBack: mockGoBack };

beforeEach(() => jest.clearAllMocks());

describe('SignupScreen — rendering', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);
    expect(getByTestId('signup-btn')).toBeTruthy();
  });

  it('renders Log In link', () => {
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);
    expect(getByTestId('login-link')).toBeTruthy();
  });
});

describe('SignupScreen — registration', () => {
  it('calls authService.register with formatted phone and full name', async () => {
    mockRegister.mockResolvedValue({ message: 'OTP sent' });
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('signup-btn'));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_number: expect.stringContaining('0871234567'),
          full_name:    'Jane Doe',
        })
      )
    );
  });

  it('navigates to OTPVerification after successful registration', async () => {
    mockRegister.mockResolvedValue({ message: 'OTP sent' });
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('signup-btn'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('OTPVerification',
        expect.objectContaining({ isSignup: true })
      )
    );
  });

  it('does not navigate when register throws', async () => {
    const { ApiError } = require('@services/authService');
    mockRegister.mockRejectedValue(new ApiError('Phone already registered', 409));
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('signup-btn'));

    await waitFor(() => expect(mockNavigate).not.toHaveBeenCalled());
  });

  it('shows error text when register fails', async () => {
    const { ApiError } = require('@services/authService');
    mockRegister.mockRejectedValue(new ApiError('Phone already registered', 409));
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('signup-btn'));

    await waitFor(() =>
      expect(getByTestId('error-text').props.children).toBe('Phone already registered')
    );
  });
});

describe('SignupScreen — navigation', () => {
  it('navigates to Login when Log In is pressed', () => {
    const { getByTestId } = render(<SignupScreen navigation={mockNavigation} />);
    fireEvent.press(getByTestId('login-link'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});