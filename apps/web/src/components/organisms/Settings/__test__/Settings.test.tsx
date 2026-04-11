/**
 * Settings tests
 * Tabs are rendered as plain <button> elements (not ARIA tabs), so we use
 * getByRole('button', { name: /label/i }) to navigate between them.
 * Tab labels: General | Notifications | Security | System
 *
 * Note: Ant Design Form validation errors render as <div class="ant-form-item-explain-error">
 * elements, NOT with role="alert". Assertions use the CSS class selector instead.
 *
 * Note: The System tab button's accessible name includes the icon's aria-label,
 * producing "database System". Use /system/i (partial) not /^system$/i (exact).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider, App as AntApp } from 'antd';

jest.mock('../../../../services', () => ({
  changeAdminPassword: jest.fn(),
  getSystemStatus: jest.fn(),
}));

jest.mock('../../../../context/NotificationContext', () => ({
  useNotifications: () => ({
    socketEnabled: true,
    soundEnabled: true,
    connected: true,
    toggleSocket: jest.fn(),
    toggleSound: jest.fn(),
  }),
}));

const { changeAdminPassword, getSystemStatus } = require('../../../../services') as {
  changeAdminPassword: jest.Mock;
  getSystemStatus: jest.Mock;
};

import Settings from '../Settings';

function renderSettings() {
  return render(<ConfigProvider><AntApp><Settings /></AntApp></ConfigProvider>);
}

// Navigate to a tab by its label text (tab buttons are plain <button> elements).
// Use a partial regex — Ant Design prepends the icon's aria-label to the button
// accessible name (e.g. "database System"), so exact anchors like /^system$/ fail.
async function clickTab(label: RegExp) {
  const btn = screen.getByRole('button', { name: label });
  await userEvent.click(btn);
}

beforeEach(() => {
  jest.clearAllMocks();

  // FIX: The Settings component accesses health.services.postgresql (and redis,
  // rabbitmq, tomtom) via SERVICE_CONFIGS. The old mock returned a flat shape
  // { databaseStatus, apiStatus } which has no .services property, causing
  // "Cannot read properties of undefined (reading 'postgresql')" at render time.
  // The mock must match the real HealthResponse type from settings.types.ts.
  getSystemStatus.mockResolvedValue({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        postgresql: { status: 'healthy' },
        redis:      { status: 'healthy' },
        rabbitmq:   { status: 'healthy' },
        tomtom:     { status: 'healthy', circuit_breaker: 'closed' },
      },
    },
  });
});

// ─── Default tab (General) ────────────────────────────────────────────────────

describe('Settings — renders', () => {
  it('renders without crashing', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all four tab buttons', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument();
  });
});

// ─── Notifications tab ────────────────────────────────────────────────────────

describe('Settings — Notifications tab', () => {
  it('shows notification settings after clicking Notifications tab', async () => {
    renderSettings();
    await clickTab(/notifications/i);
    expect(screen.getByText(/notification settings/i)).toBeInTheDocument();
  });

  it('shows the Live Notifications toggle', async () => {
    renderSettings();
    await clickTab(/notifications/i);
    expect(screen.getByText(/live notifications/i)).toBeInTheDocument();
  });

  it('shows the Notification Sound toggle', async () => {
    renderSettings();
    await clickTab(/notifications/i);
    expect(screen.getByText(/notification sound/i)).toBeInTheDocument();
  });
});

// ─── Security tab — form rendering ────────────────────────────────────────────

describe('Settings — Security tab rendering', () => {
  it('renders the current password input', async () => {
    renderSettings();
    await clickTab(/security/i);
    expect(screen.getByPlaceholderText(/enter current password/i)).toBeInTheDocument();
  });

  it('renders the Change Password button', async () => {
    renderSettings();
    await clickTab(/security/i);
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });
});

// ─── Security tab — validation ────────────────────────────────────────────────

describe('Settings — Security tab validation', () => {
  it('does not call changeAdminPassword when submitted with empty fields', async () => {
    renderSettings();
    await clickTab(/security/i);
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));
    // Antd form validation fires synchronously before the async handler
    await waitFor(() => expect(changeAdminPassword).not.toHaveBeenCalled());
  });

  it('shows a validation error when current password is missing', async () => {
    renderSettings();
    await clickTab(/security/i);
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));
    // Ant Design Form renders validation errors as .ant-form-item-explain-error divs,
    // not with role="alert". Query by class instead.
    await waitFor(() =>
      expect(document.querySelectorAll('.ant-form-item-explain-error').length).toBeGreaterThan(0)
    );
  });
});

// ─── Security tab — success path ──────────────────────────────────────────────

describe('Settings — Security tab success', () => {
  it('calls changeAdminPassword with the entered values', async () => {
    changeAdminPassword.mockResolvedValue({ success: true, message: 'Password changed' });
    renderSettings();
    await clickTab(/security/i);

    await userEvent.type(screen.getByPlaceholderText(/enter current password/i), 'OldPass123!');

    // There may be multiple password inputs — target by placeholder
    const inputs = screen.getAllByPlaceholderText(/password/i);
    // Find new password and confirm inputs (exclude the current password one)
    const newPasswordInput = inputs.find(
      (i) => i.getAttribute('placeholder')?.toLowerCase().includes('new')
    );
    const confirmInput = inputs.find(
      (i) => i.getAttribute('placeholder')?.toLowerCase().includes('confirm')
    );

    if (newPasswordInput) await userEvent.type(newPasswordInput, 'NewPass456@');
    if (confirmInput)    await userEvent.type(confirmInput, 'NewPass456@');

    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => expect(changeAdminPassword).toHaveBeenCalledWith(
      expect.objectContaining({ currentPassword: 'OldPass123!', newPassword: 'NewPass456@' })
    ));
  });

  it('does not crash when changeAdminPassword returns success: false', async () => {
    changeAdminPassword.mockResolvedValue({ success: false, message: 'Wrong password' });
    renderSettings();
    await clickTab(/security/i);

    await userEvent.type(screen.getByPlaceholderText(/enter current password/i), 'WrongPass!');
    const inputs = screen.getAllByPlaceholderText(/password/i);
    const newPwInput = inputs.find(i => i.getAttribute('placeholder')?.toLowerCase().includes('new'));
    const confirmInput = inputs.find(i => i.getAttribute('placeholder')?.toLowerCase().includes('confirm'));
    if (newPwInput)    await userEvent.type(newPwInput, 'NewPass456@');
    if (confirmInput)  await userEvent.type(confirmInput, 'NewPass456@');

    await userEvent.click(screen.getByRole('button', { name: /change password/i }));
    await waitFor(() => expect(changeAdminPassword).toHaveBeenCalled());
    // Component should still be in the document after failure
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });
});

// ─── System tab ───────────────────────────────────────────────────────────────

describe('Settings — System tab', () => {
  it('calls getSystemStatus when the System tab is opened', async () => {
    renderSettings();
    // Use /system/i partial match — the button's accessible name is "database System"
    await clickTab(/system/i);
    await waitFor(() => expect(getSystemStatus).toHaveBeenCalledTimes(1));
  });

  it('renders system status content after load', async () => {
    renderSettings();
    await clickTab(/system/i);
    await waitFor(() =>
      expect(document.body).toHaveTextContent(/operational|database|system status/i)
    );
  });
});