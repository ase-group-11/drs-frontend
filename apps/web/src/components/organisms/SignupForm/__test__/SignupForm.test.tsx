import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupForm from '../SignupForm';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockRequestSignupOTP = jest.fn();

jest.mock('../../../../services', () => ({
  requestSignupOTP: (...args: any[]) => mockRequestSignupOTP(...args),
}));

// ─── Ant Design Grid mock ─────────────────────────────────────────────────────
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Row: ({ children }: any) => <div data-testid="row">{children}</div>,
    Col: ({ children }: any) => <div data-testid="col">{children}</div>,
  };
});

beforeEach(() => {
  mockNavigate.mockReset();
  mockRequestSignupOTP.mockReset();
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const renderSignupForm = () =>
  render(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>
  );

// Open an Ant Design Select and pick an option from the portal dropdown.
async function selectOption(selectorIndex: number, optionText: string) {
  const selectors = document.querySelectorAll('.ant-select-selector');
  fireEvent.mouseDown(selectors[selectorIndex]);
  await waitFor(() => {
    const option = Array.from(
      document.querySelectorAll('.ant-select-item-option-content')
    ).find(el => el.textContent === optionText);
    if (!option) throw new Error(`Option "${optionText}" not found`);
  });
  const option = Array.from(
    document.querySelectorAll('.ant-select-item-option-content')
  ).find(el => el.textContent === optionText)!;
  fireEvent.click(option);
}

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('SignupForm — rendering', () => {
  it('renders first name input', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
  });

  it('renders last name input', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
  });

  it('renders email input', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('user@company.com')).toBeInTheDocument();
  });

  it('renders password input', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('renders confirm password input', () => {
    renderSignupForm();
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
  });

  it('renders Sign Up button', () => {
    renderSignupForm();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    renderSignupForm();
    const loginLink = screen.getByText(/log in/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});

// ─── Required field validation ────────────────────────────────────────────────
describe('SignupForm — required field validation on empty submit', () => {
  it('shows error for missing first name', async () => {
    renderSignupForm();
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your first name')).toBeInTheDocument();
    });
  });

  it('shows error for missing last name', async () => {
    renderSignupForm();
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your last name')).toBeInTheDocument();
    });
  });

  it('shows error for missing email', async () => {
    renderSignupForm();
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    });
  });

  it('shows error for missing password', async () => {
    renderSignupForm();
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });

  it('shows error for missing mobile number', async () => {
    renderSignupForm();
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your mobile number')).toBeInTheDocument();
    });
  });
});

// ─── Name length validation ────────────────────────────────────────────────────
describe('SignupForm — name minimum length', () => {
  it('rejects first name with only 1 character', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter first name'), 'J');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('First name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('rejects last name with only 1 character', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter last name'), 'D');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('Last name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('accepts first name with 2 characters', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter first name'), 'Jo');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(
        screen.queryByText('First name must be at least 2 characters')
      ).not.toBeInTheDocument();
    });
  });
});

// ─── Irish mobile validation ──────────────────────────────────────────────────
describe('SignupForm — Irish mobile number validation (+353 default)', () => {
  it('rejects a number not starting with 8', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('87 123 4567'), '912345678');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid Irish mobile number/i)).toBeInTheDocument();
    });
  });

  it('rejects an Irish number that is too short', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('87 123 4567'), '8712345');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid Irish mobile number/i)).toBeInTheDocument();
    });
  });
});

// ─── Password strength validation ─────────────────────────────────────────────
describe('SignupForm — password strength validation', () => {
  it('shows error for password shorter than 8 characters', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Ab@1');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 8 characters')
      ).toBeInTheDocument();
    });
  });

  it('shows error for password missing a special character', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Password1');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/uppercase, lowercase, number, and special character/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error for password missing an uppercase letter', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'password@1');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/uppercase, lowercase, number, and special character/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error for password missing a digit', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Password@!');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/uppercase, lowercase, number, and special character/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── Password confirmation ────────────────────────────────────────────────────
describe('SignupForm — password confirmation', () => {
  it('shows mismatch error when passwords do not match', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Secret@123');
    userEvent.type(screen.getByPlaceholderText('Confirm password'), 'Secret@999');
    userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByText('The two passwords do not match!')).toBeInTheDocument();
    });
  });

  it('does not show mismatch error when passwords match', async () => {
    renderSignupForm();
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Secret@123');
    userEvent.type(screen.getByPlaceholderText('Confirm password'), 'Secret@123');
    await waitFor(() => {
      expect(
        screen.queryByText('The two passwords do not match!')
      ).not.toBeInTheDocument();
    });
  });
});

// ─── Successful submission ────────────────────────────────────────────────────
describe('SignupForm — successful OTP request', () => {
  it('navigates to /otp with the formatted mobile number on success', async () => {
    mockRequestSignupOTP.mockResolvedValueOnce({ success: true, message: 'OTP sent' });

    renderSignupForm();

    userEvent.type(screen.getByPlaceholderText('Enter first name'), 'John');
    userEvent.type(screen.getByPlaceholderText('Enter last name'), 'Doe');

    // Role select (index 0 among ant-select-selector elements)
    await selectOption(0, 'Admin');

    // Department select (index 1)
    await selectOption(1, 'IT');

    userEvent.type(screen.getByPlaceholderText('87 123 4567'), '871234567');
    userEvent.type(screen.getByPlaceholderText('user@company.com'), 'john@example.com');
    userEvent.type(screen.getByPlaceholderText('Enter password'), 'Secret@123');
    userEvent.type(screen.getByPlaceholderText('Confirm password'), 'Secret@123');

    userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockRequestSignupOTP).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/otp',
        expect.objectContaining({
          state: expect.objectContaining({ mobileNumber: '+353871234567' }),
        })
      );
    });
  });
});