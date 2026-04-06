import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationManager, useNotifications } from '../NotificationContext';

// ─── Mock useWebSocket ────────────────────────────────────────────────────────

// IMPORTANT: All jest.fn() declarations MUST come before DEFAULT_WS.
// Declaring them after causes a Temporal Dead Zone ReferenceError at module
// evaluation time because DEFAULT_WS references them in its initialiser.
const mockDisconnect  = jest.fn();
const mockReconnect   = jest.fn();
const mockMarkAllRead = jest.fn();
const mockClearAll    = jest.fn();

const DEFAULT_WS = {
  notifications: [],
  connected:     false,
  unreadCount:   0,
  markAllRead:   mockMarkAllRead,
  clearAll:      mockClearAll,
  disconnect:    mockDisconnect,
  reconnect:     mockReconnect,
};

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useWebSocket } = require('../../hooks/useWebSocket') as { useWebSocket: jest.Mock };

// ─── Consumer helper ──────────────────────────────────────────────────────────

const Consumer: React.FC = () => {
  const ctx = useNotifications();
  return (
    <div>
      <span data-testid="connected">{String(ctx.connected)}</span>
      <span data-testid="unread">{ctx.unreadCount}</span>
      <span data-testid="socket-enabled">{String(ctx.socketEnabled)}</span>
      <span data-testid="sound-enabled">{String(ctx.soundEnabled)}</span>
      <span data-testid="scroll-to-id">{ctx.scrollToId ?? 'null'}</span>
      <button onClick={ctx.toggleSocket}>toggle socket</button>
      <button onClick={ctx.toggleSound}>toggle sound</button>
      <button onClick={() => ctx.setScrollToId('notif_123')}>set scroll</button>
      <button onClick={() => ctx.setScrollToId(null)}>clear scroll</button>
    </div>
  );
};

const renderConsumer = () =>
  render(
    <NotificationManager>
      <Consumer />
    </NotificationManager>
  );

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply after clearAllMocks wipes the implementation.
  useWebSocket.mockReturnValue({ ...DEFAULT_WS });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('NotificationContext — initial state', () => {
  it('socketEnabled is true on first render', () => {
    renderConsumer();
    expect(screen.getByTestId('socket-enabled').textContent).toBe('true');
  });

  it('soundEnabled is true on first render', () => {
    renderConsumer();
    expect(screen.getByTestId('sound-enabled').textContent).toBe('true');
  });

  it('scrollToId is null on first render', () => {
    renderConsumer();
    expect(screen.getByTestId('scroll-to-id').textContent).toBe('null');
  });

  it('forwards connected=false from useWebSocket', () => {
    renderConsumer();
    expect(screen.getByTestId('connected').textContent).toBe('false');
  });

  it('forwards connected=true when socket is up', () => {
    useWebSocket.mockReturnValue({ ...DEFAULT_WS, connected: true });
    renderConsumer();
    expect(screen.getByTestId('connected').textContent).toBe('true');
  });

  it('forwards unreadCount from useWebSocket', () => {
    useWebSocket.mockReturnValue({ ...DEFAULT_WS, unreadCount: 7 });
    renderConsumer();
    expect(screen.getByTestId('unread').textContent).toBe('7');
  });
});

// ─── toggleSocket ─────────────────────────────────────────────────────────────

describe('NotificationContext — toggleSocket()', () => {
  it('calls ws.disconnect() when socket is enabled (turning it off)', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle socket'));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('sets socketEnabled to false when toggled off', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle socket'));
    expect(screen.getByTestId('socket-enabled').textContent).toBe('false');
  });

  it('calls ws.reconnect() when socket is disabled (turning it back on)', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle socket'));
    await userEvent.click(screen.getByText('toggle socket'));
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });

  it('sets socketEnabled back to true on second toggle', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle socket'));
    await userEvent.click(screen.getByText('toggle socket'));
    expect(screen.getByTestId('socket-enabled').textContent).toBe('true');
  });
});

// ─── toggleSound ─────────────────────────────────────────────────────────────

describe('NotificationContext — toggleSound()', () => {
  it('sets soundEnabled to false on first toggle', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle sound'));
    expect(screen.getByTestId('sound-enabled').textContent).toBe('false');
  });

  it('sets soundEnabled back to true on second toggle', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle sound'));
    await userEvent.click(screen.getByText('toggle sound'));
    expect(screen.getByTestId('sound-enabled').textContent).toBe('true');
  });

  it('does not call disconnect or reconnect when sound is toggled', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('toggle sound'));
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(mockReconnect).not.toHaveBeenCalled();
  });
});

// ─── scrollToId ──────────────────────────────────────────────────────────────

describe('NotificationContext — scrollToId', () => {
  it('updates scrollToId when setScrollToId is called', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('set scroll'));
    expect(screen.getByTestId('scroll-to-id').textContent).toBe('notif_123');
  });

  it('clears scrollToId when setScrollToId(null) is called', async () => {
    renderConsumer();
    await userEvent.click(screen.getByText('set scroll'));
    await userEvent.click(screen.getByText('clear scroll'));
    expect(screen.getByTestId('scroll-to-id').textContent).toBe('null');
  });
});

// ─── Error boundary ───────────────────────────────────────────────────────────

describe('NotificationContext — useNotifications outside provider', () => {
  it('throws when used outside NotificationManager', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'useNotifications must be used inside NotificationManager'
    );
    spy.mockRestore();
  });
});