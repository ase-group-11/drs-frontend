/**
 * UNIT TESTS — LoginForm & SignupForm organisms
 *
 * LoginForm : phone validation, submit callback, responder link, signup link
 * SignupForm : full form validation (name, phone, email), submit callback
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginForm } from '@organisms/LoginForm/LoginForm';
import { SignupForm } from '@organisms/SignupForm/SignupForm';

// Mock PhoneInput — replaces the complex country-picker with a simple TextInput
jest.mock('@molecules/PhoneInput', () => {
  const { TextInput, View } = require('react-native');
  return {
    PhoneInput: ({ value, onChangePhone, error }: any) => (
      <View>
        <TextInput
          testID="phone-input"
          value={value}
          onChangeText={onChangePhone}
        />
        {error ? <View testID="phone-error" /> : null}
      </View>
    ),
  };
});

// ─────────────────────────────────────────────────────────────────────────
// LoginForm
// ─────────────────────────────────────────────────────────────────────────
describe('LoginForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onSignupPress: jest.fn(),
    onResponderPress: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders Continue button', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('renders Sign Up link', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('renders the Emergency Responder button', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    expect(getByText(/Login as Emergency Responder/i)).toBeTruthy();
  });

  it('calls onSignupPress when Sign Up is tapped', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    fireEvent.press(getByText('Sign Up'));
    expect(defaultProps.onSignupPress).toHaveBeenCalledTimes(1);
  });

  it('calls onResponderPress when the responder button is tapped', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    fireEvent.press(getByText(/Login as Emergency Responder/i));
    expect(defaultProps.onResponderPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSubmit when phone is empty', () => {
    const { getByText } = render(<LoginForm {...defaultProps} />);
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('does NOT call onSubmit when phone is too short', () => {
    const { getByText, getByTestId } = render(<LoginForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('phone-input'), '123');
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with phone and country code for a valid phone', () => {
    const { getByText, getByTestId } = render(<LoginForm {...defaultProps} />);
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith('0871234567', '+353');
  });

  it('shows loading spinner when isLoading=true', () => {
    const { queryByText } = render(<LoginForm {...defaultProps} isLoading />);
    // Button title is replaced by spinner — text disappears
    expect(queryByText('Continue')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// SignupForm
// ─────────────────────────────────────────────────────────────────────────
describe('SignupForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onLoginPress: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  const fillValidForm = (getByTestId: any, getByPlaceholderText: any) => {
    fireEvent.changeText(getByPlaceholderText('Enter your first name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your last name'), 'Doe');
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
  };

  it('renders all required fields', () => {
    const { getByPlaceholderText } = render(<SignupForm {...defaultProps} />);
    expect(getByPlaceholderText('Enter your first name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your last name')).toBeTruthy();
    expect(getByPlaceholderText('example@email.com')).toBeTruthy();
  });

  it('renders Continue and Log In buttons', () => {
    const { getByText } = render(<SignupForm {...defaultProps} />);
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('calls onLoginPress when Log In is tapped', () => {
    const { getByText } = render(<SignupForm {...defaultProps} />);
    fireEvent.press(getByText('Log In'));
    expect(defaultProps.onLoginPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSubmit when all fields are empty', () => {
    const { getByText } = render(<SignupForm {...defaultProps} />);
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it.skip('shows error when first name is missing', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter your last name'), 'Doe');
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));
    expect(getByText('Please enter your first name')).toBeTruthy();
  });

  it('shows error when first name is only 1 character', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter your first name'), 'J');
    fireEvent.changeText(getByPlaceholderText('Enter your last name'), 'Doe');
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));
    expect(getByText('First name must be at least 2 characters')).toBeTruthy();
  });

  it.skip('shows error when last name is missing', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter your first name'), 'John');
    fireEvent.changeText(getByTestId('phone-input'), '0871234567');
    fireEvent.press(getByText('Continue'));
    expect(getByText('Please enter your last name')).toBeTruthy();
  });

  it('shows email error when invalid email is entered', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fillValidForm(getByTestId, getByPlaceholderText);
    fireEvent.changeText(getByPlaceholderText('example@email.com'), 'not-an-email');
    fireEvent.press(getByText('Continue'));
    expect(getByText('Please enter a valid email address')).toBeTruthy();
  });

  it('calls onSubmit with trimmed name, phone, and country code for a valid form', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fillValidForm(getByTestId, getByPlaceholderText);
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      'John', 'Doe', '0871234567', '+353', undefined
    );
  });

  it('includes trimmed email in onSubmit when valid email is provided', () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <SignupForm {...defaultProps} />
    );
    fillValidForm(getByTestId, getByPlaceholderText);
    fireEvent.changeText(getByPlaceholderText('example@email.com'), 'john@example.com');
    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      'John', 'Doe', '0871234567', '+353', 'john@example.com'
    );
  });
});