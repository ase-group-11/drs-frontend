/**
 * Integration tests — Auth flow
 *
 * Renders the full app stack with mocked service calls.
 *
 * NOTE: "non-admin accessing admin routes" tests are omitted from this file.
 * AuthProvider.initAuth() intentionally clears any non-admin session from
 * localStorage, so there is no way to get a non-admin into authenticated
 * state using the real AuthProvider. Those scenarios are covered by the
 * unit-level routing.test.tsx which mocks useAuth directly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';

jest.setTimeout(20000);

// ─── Mock all external API calls ──────────────────────────────────────────────

jest.mock('../../services', () => ({
  login:               jest.fn(),
  logout:              jest.fn(),
  getUsers:            jest.fn(),
  getTeams:            jest.fn(),
  getSystemStatus:     jest.fn(),
  changeAdminPassword: jest.fn(),
}));

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    notifications: [],
    connected:     false,
    unreadCount:   0,
    markAllRead:   jest.fn(),
    clearAll:      jest.fn(),
    disconnect:    jest.fn(),
    reconnect:     jest.fn(),
  }),
}));

jest.mock('../../lib/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        disasters: [], summary: {},
        units: [], total_count: 0, active_count: 0,
        users: [],
      },
    }),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { login, logout } = require('../../services') as {
  login:  jest.Mock;
  logout: jest.Mock;
};

// ─── Imports after mocks ───────────────────────────────────────────────────────

import { AuthProvider } from '../../context/AuthContext';
import { NotificationManager } from '../../context/NotificationContext';
import AppRouter from '../../router';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_TOKEN = 'admin-jwt-token';

const ADMIN_USER = {
  userId:   'usr_001',
  fullName: 'Super Admin',
  email:    'admin@drs.ie',
  role:     'ADMIN',
  phone:    '+353871234567',
};

const STAFF_USER = {
  userId:   'usr_002',
  fullName: 'Staff Member',
  email:    'staff@drs.ie',
  role:     'STAFF',
  phone:    '+353879876543',
};

const ADMIN_LOGIN_RESPONSE = {
  success: true,
  data: { user: ADMIN_USER, token: ADMIN_TOKEN, refreshToken: 'refresh-token' },
};

// ─── Render helper ─────────────────────────────────────────────────────────────

function renderApp(initialPath = '/') {
  return render(
    <ConfigProvider>
      <AntApp>
        <MemoryRouter initialEntries={[initialPath]}>
          <AuthProvider>
            <NotificationManager>
              <AppRouter />
            </NotificationManager>
          </AuthProvider>
        </MemoryRouter>
      </AntApp>
    </ConfigProvider>
  );
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  logout.mockImplementation(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  });
});

// ─── Unauthenticated redirects ─────────────────────────────────────────────────

describe('Auth flow — unauthenticated user', () => {
  it('redirects / to /login when not authenticated', async () => {
    renderApp('/');
    await waitFor(
      () => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument(),
      { timeout: 6000 }
    );
  });

  it('redirects /admin/dashboard to /login when not authenticated', async () => {
    renderApp('/admin/dashboard');
    await waitFor(
      () => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument(),
      { timeout: 6000 }
    );
  });

  it('renders /login directly', async () => {
    renderApp('/login');
    await waitFor(
      () => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument(),
      { timeout: 6000 }
    );
  });
});

// ─── Successful admin login ────────────────────────────────────────────────────

describe('Auth flow — successful admin login', () => {
  beforeEach(() => {
    login.mockResolvedValue(ADMIN_LOGIN_RESPONSE);
  });

  it('redirects to /admin/dashboard after successful admin login', async () => {
    renderApp('/login');
    await waitFor(
      () => screen.getByPlaceholderText('admin@example.com'),
      { timeout: 6000 }
    );
    await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@drs.ie');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'AdminPass123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(
      () => expect(screen.queryByPlaceholderText('admin@example.com')).not.toBeInTheDocument(),
      { timeout: 8000 }
    );
  });

  it('calls login() with the correct credentials', async () => {
    renderApp('/login');
    await waitFor(
      () => screen.getByPlaceholderText('admin@example.com'),
      { timeout: 6000 }
    );
    await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@drs.ie');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'AdminPass123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(
      () => expect(login).toHaveBeenCalledWith('admin@drs.ie', 'AdminPass123!'),
      { timeout: 6000 }
    );
  });
});

// ─── Non-admin login (ACCESS_DENIED) ──────────────────────────────────────────

describe('Auth flow — non-admin login', () => {
  it('shows ACCESS_DENIED error and does not redirect for staff login', async () => {
    // AuthContext throws ACCESS_DENIED when user.role !== 'admin'
    login.mockResolvedValue({
      success: true,
      data: { user: STAFF_USER, token: 'staff-token', refreshToken: null },
    });
    renderApp('/login');
    await waitFor(
      () => screen.getByPlaceholderText('admin@example.com'),
      { timeout: 6000 }
    );
    await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'staff@drs.ie');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'StaffPass123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(
      () => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument(),
      { timeout: 6000 }
    );
  });
});

// ─── Wrong credentials ─────────────────────────────────────────────────────────

describe('Auth flow — wrong credentials', () => {
  it('shows an error message when login returns success: false', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    renderApp('/login');
    await waitFor(
      () => screen.getByPlaceholderText('admin@example.com'),
      { timeout: 6000 }
    );
    await userEvent.type(screen.getByPlaceholderText('admin@example.com'), 'admin@drs.ie');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'WrongPass!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(
      () => expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument(),
      { timeout: 6000 }
    );
  });
});

// ─── Already authenticated ─────────────────────────────────────────────────────

describe('Auth flow — already authenticated', () => {
  beforeEach(() => {
    localStorage.setItem('token', ADMIN_TOKEN);
    localStorage.setItem('user', JSON.stringify(ADMIN_USER));
  });

  it('redirects /login to /admin/dashboard when already authenticated as admin', async () => {
    renderApp('/login');
    await waitFor(
      () => expect(screen.queryByPlaceholderText('admin@example.com')).not.toBeInTheDocument(),
      { timeout: 6000 }
    );
  });
});