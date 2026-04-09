import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@services/authService', () => ({
  authService: {
    login:       jest.fn(),
    verifyLogin: jest.fn(),
    verifyRegistration: jest.fn(),
    getStoredUser: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    getAuthHeader: jest.fn(() => ({})),
    resendOTP: jest.fn(),
  },
  formatPhoneForApi: jest.fn((code, phone) => `${code}${phone}`),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(m: string, s: number) { super(m); this.name = 'ApiError'; this.status = s; }
  },
  authRequest: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockReset    = jest.fn();
const mockNavigation: any = {
  navigate: mockNavigate,
  reset: mockReset,
  goBack: jest.fn(),
};

jest.mock('@organisms/AuthHeader', () => ({
  AuthHeader: ({ title }: any) => {
    const { Text } = require('react-native');
    return <Text testID="auth-header">{title}</Text>;
  },
}));

jest.mock('@templates/AuthTemplate', () => ({
  AuthTemplate: ({ children, header }: any) => {
    const { View } = require('react-native');
    return <View>{header}{children}</View>;
  },
}));

jest.mock('@molecules/PhoneInput', () => {
  const { View, TextInput } = require('react-native');
  return {
    PhoneInput: ({ value, onChangePhone, error }: any) => (
      <View>
        <TextInput
          testID="phone-input"
          value={value}
          onChangeText={onChangePhone}
        />
      </View>
    ),
  };
});

jest.mock('@molecules/OTPInputGroup', () => {
  const { TextInput } = require('react-native');
  return {
    OTPInputGroup: ({ value, onChange }: any) => (
      <TextInput
        testID="otp-group"
        value={value}
        onChangeText={(v: string) => { if (onChange) onChange(v); }}
      />
    ),
  };
});

import { authService } from '@services/authService';
const mockLogin       = authService.login       as jest.Mock;
const mockVerifyLogin = authService.verifyLogin as jest.Mock;

import { LoginScreen } from '@screens/LoginScreen/LoginScreen';
import { OTPVerificationScreen } from '@screens/OTPVerificationScreen/OTPVerificationScreen';

beforeEach(() => jest.clearAllMocks());

// ─── LoginScreen ──────────────────────────────────────────────────────────

describe('LoginScreen — integration', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('calls authService.login with the formatted phone on submit', async () => {
    mockLogin.mockResolvedValue({ message: 'OTP sent' });
    const { getByText, getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ phone_number: expect.stringContaining('0871234567') })
      )
    );
  });

  it('navigates to OTPVerification after successful login', async () => {
    mockLogin.mockResolvedValue({ message: 'OTP sent' });
    const { getByText, getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('OTPVerification', expect.any(Object))
    );
  });

  it('does not navigate when authService.login throws', async () => {
    const { ApiError } = require('@services/authService');
    mockLogin.mockRejectedValue(new ApiError('No internet connection.', 0));

    const { getByText, getByTestId } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));

    await waitFor(() => expect(mockNavigate).not.toHaveBeenCalled());
  });

  it('navigates to Signup when Sign Up is pressed', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Sign Up'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  it('navigates to ResponderLogin when responder button is pressed', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText(/Login as Emergency Responder/i));
    expect(mockNavigate).toHaveBeenCalledWith('ResponderLogin');
  });
});

// ─── OTPVerificationScreen ────────────────────────────────────────────────

const makeOTPRoute = (overrides: any = {}) => ({
  params: {
    phoneNumber: '+3530871234567',
    isSignup: false,
    ...overrides,
  },
});

describe('OTPVerificationScreen — integration', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );
    expect(getByTestId('otp-group')).toBeTruthy();
  });

  it('calls authService.verifyLogin when Verify button is pressed with 6 digits', async () => {
    mockVerifyLogin.mockResolvedValue({
      tokens: { access_token: 'tok', refresh_token: 'ref', token_type: 'Bearer', expires_in: 3600 },
      user: { id: 'u1', full_name: 'John' },
    });

    const { getByTestId, getByText } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '123456');
    fireEvent.press(getByText(/Verify/i));

    await waitFor(() =>
      expect(mockVerifyLogin).toHaveBeenCalledWith(
        expect.objectContaining({ otp: '123456' })
      )
    );
  });

  it('navigates to Main after successful verification', async () => {
    mockVerifyLogin.mockResolvedValue({
      tokens: { access_token: 'tok', refresh_token: 'ref', token_type: 'Bearer', expires_in: 3600 },
      user: { id: 'u1', full_name: 'Jane' },
    });

    const { getByTestId, getByText } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '654321');
    fireEvent.press(getByText(/Verify/i));

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({ routes: expect.arrayContaining([{ name: 'Main' }]) })
      )
    );
  });

  it('does not navigate when verifyLogin rejects', async () => {
    const { ApiError } = require('@services/authService');
    mockVerifyLogin.mockRejectedValue(new ApiError('Invalid OTP', 400));

    const { getByTestId, getByText } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '000000');
    fireEvent.press(getByText(/Verify/i));

    await waitFor(() => expect(mockReset).not.toHaveBeenCalled());
  });
});
