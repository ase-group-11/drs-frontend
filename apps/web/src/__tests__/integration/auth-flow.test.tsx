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
 *
 * FIX: Added mapbox-gl mock. AppRouter renders the full app including
 * DisasterReports, which statically imports mapbox-gl. In a jsdom environment
 * mapbox-gl attempts to access WebGL/canvas APIs that don't exist, causing a
 * native exception that crashes the Jest worker process entirely (manifests as
 * "Jest worker encountered 4 child process exceptions, exceeding retry limit").
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';

jest.setTimeout(20000);

// ─── Mock mapbox-gl ───────────────────────────────────────────────────────────
// FIX: AppRouter statically imports components that use mapbox-gl (e.g.
// DisasterReports). Without this mock, mapbox-gl's native bindings crash the
// Jest worker process before any test runs — no assertion failure, just a
// hard worker exit with "4 child process exceptions, exceeding retry limit".
jest.mock('mapbox-gl', () => ({
  Map:               jest.fn().mockImplementation(() => ({
    on:            jest.fn(),
    off:           jest.fn(),
    remove:        jest.fn(),
    addControl:    jest.fn(),
    removeControl: jest.fn(),
    addSource:     jest.fn(),
    removeSource:  jest.fn(),
    addLayer:      jest.fn(),
    removeLayer:   jest.fn(),
    getSource:     jest.fn(),
    getLayer:      jest.fn(),
    flyTo:         jest.fn(),
    fitBounds:     jest.fn(),
    resize:        jest.fn(),
    setCenter:     jest.fn(),
    isStyleLoaded: jest.fn(() => true),
  })),
  NavigationControl: jest.fn().mockImplementation(() => ({})),
  FullscreenControl: jest.fn().mockImplementation(() => ({})),
  ScaleControl:      jest.fn().mockImplementation(() => ({})),
  GeolocateControl:  jest.fn().mockImplementation(() => ({})),
  Marker:            jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo:     jest.fn().mockReturnThis(),
    remove:    jest.fn(),
  })),
  Popup:             jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setHTML:   jest.fn().mockReturnThis(),
    addTo:     jest.fn().mockReturnThis(),
    remove:    jest.fn(),
  })),
  LngLatBounds:      jest.fn().mockImplementation(() => ({
    extend:    jest.fn().mockReturnThis(),
    isEmpty:   jest.fn(() => false),
    getCenter: jest.fn(() => ({ lng: 0, lat: 0 })),
  })),
  accessToken: '',
  supported:   jest.fn(() => true),
}));

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
  // FIX: Also mock healthClient so getSystemStatus() doesn't throw when the
  // Settings page is rendered as part of the full app.
  healthClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          postgresql: { status: 'healthy' },
          redis:      { status: 'healthy' },
          rabbitmq:   { status: 'healthy' },
          tomtom:     { status: 'healthy' },
        },
      },
    }),
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSystemStatus, getUsers, getTeams } = require('../../services') as {
  getSystemStatus: jest.Mock;
  getUsers:        jest.Mock;
  getTeams:        jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();

  logout.mockImplementation(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  });

  // FIX: Dashboard.tsx calls getSystemStatus() on mount and does `res.success`
  // immediately. With a bare jest.fn() (returns undefined), this throws:
  //   "TypeError: Cannot read properties of undefined (reading 'success')"
  // That uncaught error in an async effect crashes the Node worker process,
  // producing "Jest worker encountered 4 child process exceptions".
  getSystemStatus.mockResolvedValue({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        postgresql: { status: 'healthy' },
        redis:      { status: 'healthy' },
        rabbitmq:   { status: 'healthy' },
        tomtom:     { status: 'healthy' },
      },
    },
  });

  // Guard the other service mocks too — Dashboard also fires apiClient.get()
  // calls for disasters, units, and users on mount. The axios mock already
  // returns safe empty shapes, but these service-level mocks need to not throw.
  getUsers.mockResolvedValue({ success: true, data: { users: [], total_count: 0 } });
  getTeams.mockResolvedValue({ success: true, data: { units: [], total_count: 0 } });
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