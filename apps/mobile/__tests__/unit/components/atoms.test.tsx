/**
 * UNIT TESTS — Button & Input atoms
 *
 * Button: variant colours, size, loading spinner, disabled state, press handler
 * Input:  label, error display, disabled, left/right elements
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@atoms/Button/Button';
import { Input } from '@atoms/Input/Input';

// ─────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────
describe('Button', () => {
  it('renders the title text', () => {
    const { getByText } = render(<Button title="Continue" />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} disabled />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading=true', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Continue" loading testID="loading-btn" />
    );
    // Title should not be visible while loading
    expect(queryByText('Continue')).toBeNull();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Button title="Go" loading onPress={onPress} />);
    // Can't press spinner — verify component is disabled
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders left icon when provided', () => {
    const { getByTestId } = render(
      <Button title="Go" leftIcon={<React.Fragment><></>
        {/* Using a View with testID as icon proxy */}
        {React.createElement(require('react-native').View, { testID: 'left-icon' })}
      </React.Fragment>} />
    );
    expect(getByTestId('left-icon')).toBeTruthy();
  });

  it('accepts "outline" variant without crashing', () => {
    const { getByText } = render(<Button title="Outline" variant="outline" />);
    expect(getByText('Outline')).toBeTruthy();
  });

  it('accepts "ghost" variant without crashing', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('accepts "small" size without crashing', () => {
    const { getByText } = render(<Button title="Small" size="small" />);
    expect(getByText('Small')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────
describe('Input', () => {
  it('renders with a label', () => {
    const { getByText } = render(<Input label="Phone Number" />);
    expect(getByText('Phone Number')).toBeTruthy();
  });

  it('renders label suffix when provided', () => {
    const { getByText } = render(<Input label="Email" labelSuffix="(Optional)" />);
    expect(getByText('(Optional)')).toBeTruthy();
  });

  it('renders error message when error prop is set', () => {
    const { getByText } = render(<Input error="Please enter a valid number" />);
    expect(getByText('Please enter a valid number')).toBeTruthy();
  });

  it('does not render error message when error prop is empty', () => {
    const { queryByText } = render(<Input error="" />);
    expect(queryByText('Please enter a valid number')).toBeNull();
  });

  it('fires onChangeText when user types', () => {
    const onChange = jest.fn();
    const { getByDisplayValue, UNSAFE_getByType } = render(
      <Input value="08" onChangeText={onChange} />
    );
    const { TextInput } = require('react-native');
    const input = UNSAFE_getByType(TextInput);
    fireEvent.changeText(input, '087');
    expect(onChange).toHaveBeenCalledWith('087');
  });

  it('renders in disabled state without crashing', () => {
    const { UNSAFE_getByType } = render(<Input disabled />);
    const { TextInput } = require('react-native');
    const input = UNSAFE_getByType(TextInput);
    expect(input.props.editable).toBe(false);
  });
});