import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OtpVerificationForm from '../OtpVerificationForm';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate    = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

const mockVerifySignupOTP  = jest.fn();
const mockRequestSignupOTP = jest.fn();

jest.mock('../../../../services', () => ({
  verifySignupOTP:  (...args: any[]) => mockVerifySignupOTP(...args),
  requestSignupOTP: (...args: any[]) => mockRequestSignupOTP(...args),
}));

// OtpVerificationForm calls useAuth() → loginWithToken.
// loginWithToken (AuthContext) sets localStorage AND navigates to /admin/dashboard.
// Declare as jest.fn() then re-implement in EVERY beforeEach — jest.clearAllMocks()
// would otherwise wipe the implementation between tests.
const mockLoginWithToken = jest.fn();

jest.mock('../../../../hooks', () => ({
  useAuth: () => ({
    loginWithToken: mockLoginWithToken,
  }),
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockVerifySignupOTP.mockReset();
  mockRequestSignupOTP.mockReset();
  localStorage.clear();

  // Re-apply implementation every test because jest.clearAllMocks() wipes it.
  // loginWithToken saves to localStorage then navigates — mirror AuthContext behaviour.
  mockLoginWithToken.mockImplementation((token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    mockNavigate('/admin/dashboard');
  });

  // Default: valid location state with a mobile number
  mockUseLocation.mockReturnValue({
    state: { mobileNumber: '+353871234567', signupData: {} },
  });

  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const renderOtp = () =>
  render(
    <MemoryRouter>
      <OtpVerificationForm />
    </MemoryRouter>
  );

/** Fill all 6 OTP boxes with the given 6-digit code string. */
const fillOtp = (code: string) => {
  const boxes = screen.getAllByRole('textbox');
  code.split('').forEach((digit, i) => {
    userEvent.type(boxes[i], digit);
  });
};

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('OtpVerificationForm — rendering', () => {
  it('renders exactly 6 input boxes', () => {
    renderOtp();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('renders the Verify button', () => {
    renderOtp();
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('Verify button is disabled initially', () => {
    renderOtp();
    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
  });

  it('renders the masked phone number in the description', () => {
    renderOtp();
    expect(screen.getByText(/\+353 \*\* \*\*\* 4567/)).toBeInTheDocument();
  });

  it('renders the resend countdown button as disabled initially', () => {
    renderOtp();
    expect(screen.getByRole('button', { name: /resend code in/i })).toBeDisabled();
  });
});

// ─── Verify button enable state ───────────────────────────────────────────────
describe('OtpVerificationForm — Verify button enable state', () => {
  it('remains disabled when fewer than 6 digits entered', () => {
    renderOtp();
    fillOtp('12345');
    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
  });

  it('becomes enabled once all 6 digits are entered', () => {
    renderOtp();
    fillOtp('123456');
    expect(screen.getByRole('button', { name: /verify/i })).not.toBeDisabled();
  });
});

// ─── Input behaviour ──────────────────────────────────────────────────────────
describe('OtpVerificationForm — digit input behaviour', () => {
  it('rejects non-numeric characters', () => {
    renderOtp();
    const firstBox = screen.getAllByRole('textbox')[0];
    userEvent.type(firstBox, 'a');
    expect(firstBox).toHaveValue('');
  });

  it('rejects special characters', () => {
    renderOtp();
    const firstBox = screen.getAllByRole('textbox')[0];
    userEvent.type(firstBox, '@');
    expect(firstBox).toHaveValue('');
  });

  it('accepts a valid digit', () => {
    renderOtp();
    const firstBox = screen.getAllByRole('textbox')[0];
    userEvent.type(firstBox, '7');
    expect(firstBox).toHaveValue('7');
  });

  it('accepts digits 0-9', () => {
    renderOtp();
    const boxes = screen.getAllByRole('textbox');
    '012345'.split('').forEach((digit, i) => {
      userEvent.type(boxes[i], digit);
      expect(boxes[i]).toHaveValue(digit);
    });
  });
});

// ─── Countdown / Resend ───────────────────────────────────────────────────────
describe('OtpVerificationForm — countdown timer', () => {
  it('displays the initial countdown of 0:60', () => {
    renderOtp();
    expect(screen.getByText(/resend code in 0:60/i)).toBeInTheDocument();
  });

  it('decrements by 1 second after one tick', () => {
    renderOtp();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText(/resend code in 0:59/i)).toBeInTheDocument();
  });

  it('decrements by 3 seconds when advanced tick by tick', () => {
    renderOtp();
    act(() => { jest.advanceTimersByTime(1000); });
    act(() => { jest.advanceTimersByTime(1000); });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText(/resend code in 0:57/i)).toBeInTheDocument();
  });

  it('enables the Resend button after all 60 ticks', () => {
    renderOtp();
    expect(screen.getByRole('button', { name: /resend code in/i })).toBeDisabled();
    for (let i = 0; i < 60; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    expect(screen.getByRole('button', { name: /^resend code$/i })).not.toBeDisabled();
  });
});

// ─── Redirect when no location state ─────────────────────────────────────────
describe('OtpVerificationForm — redirect without location state', () => {
  it('redirects to /signup when mobileNumber is absent from location state', async () => {
    mockUseLocation.mockReturnValueOnce({ state: null });
    renderOtp();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });
  });

  it('redirects to /signup when location state has no mobileNumber', async () => {
    mockUseLocation.mockReturnValueOnce({ state: { signupData: {} } });
    renderOtp();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
    });
  });
});

// ─── Successful verification ──────────────────────────────────────────────────
describe('OtpVerificationForm — successful verification', () => {
  it('navigates to /admin/dashboard after a correct OTP', async () => {
    mockVerifySignupOTP.mockResolvedValueOnce({
      success: true,
      data: { token: 'tok_123', user: { role: 'admin' } },
    });
    renderOtp();
    fillOtp('123456');
    userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('saves the token to localStorage on success', async () => {
    mockVerifySignupOTP.mockResolvedValueOnce({
      success: true,
      data: { token: 'tok_abc', user: { role: 'admin' } },
    });
    renderOtp();
    fillOtp('654321');
    userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('tok_abc');
    });
  });

  it('saves the user object to localStorage on success', async () => {
    const fakeUser = { role: 'admin', fullName: 'John' };
    mockVerifySignupOTP.mockResolvedValueOnce({
      success: true,
      data: { token: 'tok_abc', user: fakeUser },
    });
    renderOtp();
    fillOtp('654321');
    userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(fakeUser);
    });
  });
});

// ─── Failed verification ──────────────────────────────────────────────────────
describe('OtpVerificationForm — failed verification', () => {
  it('does not navigate to /admin/dashboard on wrong OTP', async () => {
    mockVerifySignupOTP.mockResolvedValueOnce({ success: false, message: 'Invalid OTP' });
    renderOtp();
    fillOtp('000000');
    userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('clears all OTP inputs on failed verification', async () => {
    mockVerifySignupOTP.mockResolvedValueOnce({ success: false, message: 'Invalid OTP' });
    renderOtp();
    fillOtp('000000');
    userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      screen.getAllByRole('textbox').forEach((box) => {
        expect(box).toHaveValue('');
      });
    });
  });
});