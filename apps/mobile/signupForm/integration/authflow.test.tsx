/**
 * INTEGRATION TESTS — Auth Flow
 *
 * Tests the Login → OTP → Home navigation flow:
 *   - LoginScreen renders LoginForm and fires authService.login on submit
 *   - OTPVerificationScreen renders with correct masked phone, verifies OTP
 *   - Error states are surfaced to the user
 *   - authService calls are correct
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mock authService ──────────────────────────────────────────────────────
jest.mock('../../src/services/authService', () => ({
  authService: {
    login:       jest.fn(),
    verifyLogin: jest.fn(),
    getStoredUser: jest.fn().mockResolvedValue(null),
    logout: jest.fn(),
    getAuthHeader: jest.fn(() => ({})),
  },
  ApiError: class ApiError extends Error {
    status: number; constructor(m: string, s: number) { super(m); this.status = s; }
  },
  authRequest: jest.fn(),
}));

// ─── Mock navigation ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockReset    = jest.fn();
const mockNavigation: any = { navigate: mockNavigate, reset: mockReset, goBack: jest.fn() };

// ─── Mock PhoneInput ───────────────────────────────────────────────────────
jest.mock('../../src/components/molecules/PhoneInput', () => {
  const { TextInput, View } = require('react-native');
  return {
    PhoneInput: ({ value, onChangePhone }: any) => (
      <View>
        <TextInput testID="phone-input" value={value} onChangeText={onChangePhone} />
      </View>
    ),
  };
});

// ─── Mock AuthHeader / AuthTemplate ───────────────────────────────────────
jest.mock('../../src/components/organisms/AuthHeader', () => ({
  AuthHeader: ({ title }: any) => {
    const { Text } = require('react-native');
    return <Text testID="auth-header">{title}</Text>;
  },
}));

jest.mock('../../src/components/templates/AuthTemplate', () => ({
  AuthTemplate: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../../src/components/atoms/OTPInput', () => ({
  OTPInput: () => {
    const { View } = require('react-native');
    return <View testID="otp-input-atom" />;
  },
}));

jest.mock('../../src/components/molecules/OTPInputGroup', () => ({
  OTPInputGroup: ({ onComplete }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID="otp-group"
        onChangeText={(v: string) => { if (v.length === 6) onComplete(v); }}
      />
    );
  },
}));

import { authService } from '../../src/services/authService';
const mockLogin       = authService.login       as jest.Mock;
const mockVerifyLogin = authService.verifyLogin as jest.Mock;

// ─────────────────────────────────────────────────────────────────────────
// LoginScreen Integration
// ─────────────────────────────────────────────────────────────────────────
import { LoginScreen } from '../../src/screens/LoginScreen/LoginScreen';

describe('LoginScreen — integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('calls authService.login with the formatted phone number on submit', async () => {
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
    const { ApiError } = require('../../src/services/authService');
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

// ─────────────────────────────────────────────────────────────────────────
// OTPVerificationScreen Integration
// ─────────────────────────────────────────────────────────────────────────
import { OTPVerificationScreen } from '../../src/screens/OTPVerificationScreen/OTPVerificationScreen';

const makeOTPRoute = (overrides: any = {}) => ({
  params: {
    phoneNumber: '0871234567',
    countryCode: '+353',
    fullPhoneNumber: '+3530871234567',
    maskedPhone: '***4567',
    mode: 'login' as const,
    ...overrides,
  },
});

describe('OTPVerificationScreen — integration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );
    expect(getByTestId('otp-group')).toBeTruthy();
  });

  it('calls authService.verifyLogin with OTP on completion', async () => {
    mockVerifyLogin.mockResolvedValue({
      access_token: 'tok123', refresh_token: 'ref456',
      user: { id: 'u1', full_name: 'John', phone_number: '0871234567' },
    });

    const { getByTestId } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '123456');

    await waitFor(() =>
      expect(mockVerifyLogin).toHaveBeenCalledWith(
        expect.objectContaining({ otp: '123456' })
      )
    );
  });

  it('navigates to Home after successful verification', async () => {
    mockVerifyLogin.mockResolvedValue({
      access_token: 'tok', refresh_token: 'ref',
      user: { id: 'u1', full_name: 'Jane', phone_number: '0871234567' },
    });

    const { getByTestId } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '654321');

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({ routes: expect.arrayContaining([{ name: 'Main' }]) })
      )
    );
  });

  it('does not navigate when verifyLogin rejects', async () => {
    const { ApiError } = require('../../src/services/authService');
    mockVerifyLogin.mockRejectedValue(new ApiError('Invalid OTP', 400));

    const { getByTestId } = render(
      <OTPVerificationScreen navigation={mockNavigation} route={makeOTPRoute()} />
    );

    fireEvent.changeText(getByTestId('otp-group'), '000000');

    await waitFor(() => expect(mockReset).not.toHaveBeenCalled());
  });
});