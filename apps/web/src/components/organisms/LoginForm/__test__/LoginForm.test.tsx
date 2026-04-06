import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '../LoginForm';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLogin = jest.fn();

jest.mock('../../../../hooks', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

beforeEach(() => {
  mockLogin.mockReset();
});

// ─── Helper ───────────────────────────────────────────────────────────────────
// LoginForm uses useNavigate() for the Forgot password button → needs a Router.
const renderLoginForm = () =>
  render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  );

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('LoginForm — rendering', () => {
  it('renders the email input', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
  });

  it('renders the password input', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('renders the Sign In button', () => {
    renderLoginForm();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the Forgot password link', () => {
    renderLoginForm();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });
});

// ─── Empty field validation ───────────────────────────────────────────────────
describe('LoginForm — empty field validation', () => {
  it('shows required error when email is empty on submit', async () => {
    renderLoginForm();
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    });
  });

  it('shows required error when password is empty on submit', async () => {
    renderLoginForm();
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });
});

// ─── Email format validation ──────────────────────────────────────────────────
describe('LoginForm — email format validation', () => {
  it('shows format error for invalid email', async () => {
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'notanemail');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('does not show format error for a valid email', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@example.com');
    userEvent.type(screen.getByPlaceholderText('Enter your password'), 'anypassword');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email')).not.toBeInTheDocument();
    });
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────
describe('LoginForm — form submission', () => {
  it('calls login() with the correct email and password', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@test.com');
    userEvent.type(screen.getByPlaceholderText('Enter your password'), 'Secret@123');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'Secret@123');
    });
  });

  it('does not call login() when fields are empty', async () => {
    renderLoginForm();
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});

// ─── Error display ────────────────────────────────────────────────────────────
describe('LoginForm — error display', () => {
  it('shows ACCESS_DENIED message when non-admin tries to log in', async () => {
    // LoginForm passes err.message directly to message.error().
    // The AuthContext throws 'ACCESS_DENIED' as the raw error message.
    mockLogin.mockRejectedValueOnce(new Error('ACCESS_DENIED'));
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'staff@test.com');
    userEvent.type(screen.getByPlaceholderText('Enter your password'), 'Secret@123');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('ACCESS_DENIED')).toBeInTheDocument();
    });
  });

  it('shows generic error for other login failures', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@test.com');
    userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows no error message when login succeeds', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLoginForm();
    userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@test.com');
    userEvent.type(screen.getByPlaceholderText('Enter your password'), 'Secret@123');
    userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    // No error toast should appear on success
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });
});