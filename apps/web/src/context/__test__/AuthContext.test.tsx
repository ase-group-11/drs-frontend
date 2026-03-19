import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// jest.mock() is hoisted by Babel before any variable declarations run, AND
// Babel's scope checker forbids referencing browser globals (like localStorage)
// inside the factory. Keep the factory minimal — just plain jest.fn() stubs.
jest.mock('../../services', () => ({
  login:  jest.fn(),
  logout: jest.fn(),
}));

// Retrieve typed references to the mocked functions after jest.mock has run.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockServices    = require('../../services');
const mockLoginService  = mockServices.login  as jest.Mock;
const mockLogoutService = mockServices.logout as jest.Mock;

// ─── Helper consumer component ────────────────────────────────────────────────
// Renders key context values as text so tests can assert on them easily.
const AuthConsumer: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  return (
    <div>
      <div data-testid="is-authenticated">{String(isAuthenticated)}</div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <div data-testid="user-role">{user?.role ?? 'null'}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </MemoryRouter>
  );

// ─── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  mockLoginService.mockReset();
  mockLogoutService.mockReset();
});

// ─── Initial state ────────────────────────────────────────────────────────────
describe('AuthContext — initial state', () => {
  it('is not authenticated when localStorage is empty', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('isLoading settles to false after initialisation', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });
  });

  it('user role is null when not authenticated', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('user-role')).toHaveTextContent('null');
    });
  });
});

// ─── Session restore ──────────────────────────────────────────────────────────
describe('AuthContext — session restore from localStorage', () => {
  it('restores an admin session on mount', async () => {
    localStorage.setItem('token', 'tok_admin');
    localStorage.setItem('user', JSON.stringify({ role: 'admin', userId: '1' }));

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    });
  });

  it('does NOT restore a staff session', async () => {
    localStorage.setItem('token', 'tok_staff');
    localStorage.setItem('user', JSON.stringify({ role: 'staff', userId: '2' }));

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('does NOT restore a manager session', async () => {
    localStorage.setItem('token', 'tok_mgr');
    localStorage.setItem('user', JSON.stringify({ role: 'manager', userId: '3' }));

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('clears stale non-admin token from localStorage', async () => {
    localStorage.setItem('token', 'tok_staff');
    localStorage.setItem('user', JSON.stringify({ role: 'staff', userId: '2' }));

    renderWithAuth();
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('clears stale non-admin user from localStorage', async () => {
    localStorage.setItem('token', 'tok_staff');
    localStorage.setItem('user', JSON.stringify({ role: 'staff', userId: '2' }));

    renderWithAuth();
    await waitFor(() => {
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  it('does NOT restore session when token is missing even if user exists', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'admin', userId: '1' }));
    // no token key

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });
});

// ─── login() — ACCESS_DENIED ──────────────────────────────────────────────────
describe('AuthContext — login() ACCESS_DENIED for non-admin roles', () => {
  const nonAdminRoles = ['staff', 'manager', 'user', 'viewer'];

  nonAdminRoles.forEach((role) => {
    it(`throws ACCESS_DENIED for role: ${role}`, async () => {
      mockLoginService.mockResolvedValueOnce({
        success: true,
        data: { user: { role }, token: `tok_${role}` },
      });

      let caughtError: Error | null = null;

      const LoginTrigger: React.FC = () => {
        const { login } = useAuth();
        React.useEffect(() => {
          login('test@test.com', 'pass').catch((e) => { caughtError = e; });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return null;
      };

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginTrigger />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(caughtError?.message).toBe('ACCESS_DENIED');
      });
    });
  });
});

// ─── login() — successful admin login ────────────────────────────────────────
describe('AuthContext — login() success for admin', () => {
  it('sets isAuthenticated to true', async () => {
    mockLoginService.mockResolvedValueOnce({
      success: true,
      data: { user: { role: 'admin', userId: '1' }, token: 'tok_admin' },
    });

    const LoginTrigger: React.FC = () => {
      const { login } = useAuth();
      React.useEffect(() => { login('admin@test.com', 'pass'); }, []); // eslint-disable-line
      return null;
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginTrigger />
          <AuthConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });
  });

  it('stores the token in localStorage', async () => {
    mockLoginService.mockResolvedValueOnce({
      success: true,
      data: { user: { role: 'admin', userId: '1' }, token: 'tok_admin' },
    });

    const LoginTrigger: React.FC = () => {
      const { login } = useAuth();
      React.useEffect(() => { login('admin@test.com', 'pass'); }, []); // eslint-disable-line
      return null;
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginTrigger />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('tok_admin');
    });
  });

  it('navigates to /admin/dashboard', async () => {
    mockLoginService.mockResolvedValueOnce({
      success: true,
      data: { user: { role: 'admin', userId: '1' }, token: 'tok_admin' },
    });

    const LoginTrigger: React.FC = () => {
      const { login } = useAuth();
      React.useEffect(() => { login('admin@test.com', 'pass'); }, []); // eslint-disable-line
      return null;
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginTrigger />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });
});

// ─── login() — API failure ────────────────────────────────────────────────────
describe('AuthContext — login() API failure', () => {
  it('throws the error message returned by the API', async () => {
    mockLoginService.mockResolvedValueOnce({
      success: false,
      message: 'Invalid credentials',
    });

    let caughtError: Error | null = null;

    const LoginTrigger: React.FC = () => {
      const { login } = useAuth();
      React.useEffect(() => {
        login('bad@test.com', 'wrong').catch((e) => { caughtError = e; });
      }, []); // eslint-disable-line
      return null;
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginTrigger />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(caughtError?.message).toBe('Invalid credentials');
    });
  });
});

// ─── logout() ─────────────────────────────────────────────────────────────────
describe('AuthContext — logout()', () => {
  // Seed an authenticated admin session before each logout test
  beforeEach(() => {
    localStorage.setItem('token', 'tok_admin');
    localStorage.setItem('user', JSON.stringify({ role: 'admin', userId: '1' }));
  });

  it('sets isAuthenticated to false', async () => {
    renderWithAuth();
    await waitFor(() =>
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    );

    act(() => { screen.getByRole('button', { name: /logout/i }).click(); });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  it('calls logoutService which is responsible for clearing localStorage', async () => {
    // AuthContext.logout() delegates storage cleanup to logoutService.
    // The context's own responsibility is to call the service — we verify that
    // here. The actual localStorage.removeItem calls are tested in the
    // logoutService unit tests (services layer), not here.
    renderWithAuth();
    await waitFor(() => screen.getByTestId('is-authenticated'));

    act(() => { screen.getByRole('button', { name: /logout/i }).click(); });

    await waitFor(() => {
      expect(mockLogoutService).toHaveBeenCalledTimes(1);
    });
  });

  it('calls logoutService exactly once per logout action', async () => {
    renderWithAuth();
    await waitFor(() => screen.getByTestId('is-authenticated'));

    act(() => { screen.getByRole('button', { name: /logout/i }).click(); });

    await waitFor(() => {
      expect(mockLogoutService).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to /login', async () => {
    renderWithAuth();
    await waitFor(() => screen.getByTestId('is-authenticated'));

    act(() => { screen.getByRole('button', { name: /logout/i }).click(); });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});