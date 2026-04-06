import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Axios ESM fix ────────────────────────────────────────────────────────────
// Axios v1+ ships ESM; Jest runs CJS. Mock lib/axios before any module that
// imports it reaches the module registry, cutting the import chain that would
// otherwise cause "SyntaxError: Cannot use import statement outside a module".
jest.mock('../../lib/axios', () => ({
  __esModule: true,
  default: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
    patch:  jest.fn(),
    interceptors: {
      request:  { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

// ForgotPasswordPage directly imports axios before our mock intercepts it.
// Stub it so the module graph stays clean.
jest.mock('../../components/pages/ForgotPasswordPage/ForgotPasswordPage', () => ({
  __esModule: true,
  default: () => <div data-testid="forgot-password-page" />,
}));

import AppRouter from '../index';

// ─── Control auth state per test ──────────────────────────────────────────────
const mockUseAuth = jest.fn();

jest.mock('../../hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// Stub page components — routing tests care about WHICH page renders, not content
jest.mock('../../components/pages', () => ({
  LoginPage:           () => <div data-testid="login-page" />,
  SignupPage:          () => <div data-testid="signup-page" />,
  OtpPage:             () => <div data-testid="otp-page" />,
  DashboardPage:       () => <div data-testid="dashboard-page" />,
  UserManagementPage:  () => <div data-testid="user-management-page" />,
  DisasterReportsPage: () => <div data-testid="disaster-reports-page" />,
  EmergencyTeamsPage:  () => <div data-testid="emergency-teams-page" />,
  SettingsPage:        () => <div data-testid="settings-page" />,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>
  );

// ─── Unauthenticated access ───────────────────────────────────────────────────
describe('Routing — unauthenticated user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
  });

  it('renders LoginPage at /login', () => {
    renderAt('/login');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders SignupPage at /signup', () => {
    renderAt('/signup');
    expect(screen.getByTestId('signup-page')).toBeInTheDocument();
  });

  it('renders OtpPage at /otp', () => {
    renderAt('/otp');
    expect(screen.getByTestId('otp-page')).toBeInTheDocument();
  });

  it('redirects / to /login', async () => {
    renderAt('/');
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('redirects /admin/dashboard to /login', async () => {
    renderAt('/admin/dashboard');
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('redirects /admin/users to /login', async () => {
    renderAt('/admin/users');
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('redirects /admin/settings to /login', async () => {
    renderAt('/admin/settings');
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('redirects an unknown path to /login', async () => {
    renderAt('/completely/unknown/route');
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });
});

// ─── Authenticated admin access ───────────────────────────────────────────────
describe('Routing — authenticated admin', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { role: 'admin', userId: '1' } });
  });

  it('renders DashboardPage at /admin/dashboard', () => {
    renderAt('/admin/dashboard');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('renders UserManagementPage at /admin/users', () => {
    renderAt('/admin/users');
    expect(screen.getByTestId('user-management-page')).toBeInTheDocument();
  });

  it('renders DisasterReportsPage at /admin/disaster-reports', () => {
    renderAt('/admin/disaster-reports');
    expect(screen.getByTestId('disaster-reports-page')).toBeInTheDocument();
  });

  it('renders EmergencyTeamsPage at /admin/teams', () => {
    renderAt('/admin/teams');
    expect(screen.getByTestId('emergency-teams-page')).toBeInTheDocument();
  });

  it('renders SettingsPage at /admin/settings', () => {
    renderAt('/admin/settings');
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
  });

  it('redirects / to /admin/dashboard', async () => {
    renderAt('/');
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
  });

  it('redirects /login to /admin/dashboard when already logged in', async () => {
    renderAt('/login');
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
  });

  it('redirects /signup to /admin/dashboard when already logged in', async () => {
    renderAt('/signup');
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
  });
});

// ─── Non-admin blocked from admin routes ──────────────────────────────────────
describe('Routing — authenticated non-admin', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { role: 'staff', userId: '2' } });
  });

  it('redirects /admin/dashboard to /unauthorized', async () => {
    renderAt('/admin/dashboard');
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('redirects /admin/users to /unauthorized', async () => {
    renderAt('/admin/users');
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('redirects /admin/settings to /unauthorized', async () => {
    renderAt('/admin/settings');
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('shows a link back to /login on the unauthorized page', async () => {
    renderAt('/admin/dashboard');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /return to login/i })).toBeInTheDocument()
    );
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────
describe('Routing — auth loading state', () => {
  it('shows a loading indicator while auth is resolving on a protected route', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });
    renderAt('/admin/dashboard');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a loading indicator on public route while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });
    renderAt('/login');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});