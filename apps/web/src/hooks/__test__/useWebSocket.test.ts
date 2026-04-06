/**
 * useWebSocket tests
 *
 * Strategy:
 *  - Replace global.WebSocket with a controllable MockWebSocket class.
 *  - Re-install the constructor in beforeEach so jest.clearAllMocks() cannot
 *    wipe the implementation between tests.
 *  - Use jest.useFakeTimers() to control the 50ms mount delay and 3000ms reconnect.
 *  - Use renderHook + act to drive state changes.
 *  - localStorage is reset between tests.
 */

import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// ─── MockWebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  /** Most-recently created instance — tests drive it via this reference. */
  static last: MockWebSocket | null = null;

  onopen:    ((e: Event)        => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose:   ((e: CloseEvent)   => void) | null = null;
  onerror:   ((e: Event)        => void) | null = null;

  send  = jest.fn();
  close = jest.fn();

  constructor(public readonly url: string) {
    MockWebSocket.last = this;
  }

  /** Simulate the server accepting the connection. */
  triggerOpen() {
    this.onopen?.({} as Event);
  }

  /** Simulate the server sending a message. */
  triggerMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  /** Simulate the connection being dropped (default: abnormal closure). */
  triggerClose(code = 1006) {
    this.onclose?.({ code, reason: '' } as CloseEvent);
  }

  /** Simulate a WebSocket error followed by a close. */
  triggerError() {
    this.onerror?.({} as Event);
    this.triggerClose();
  }
}

// Save original so we can restore after all tests.
const OriginalWebSocket = (global as any).WebSocket;

afterAll(() => {
  (global as any).WebSocket = OriginalWebSocket;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN = 'test-token-abc';

function seedToken() {
  localStorage.setItem('token', TOKEN);
}

beforeEach(() => {
  jest.useFakeTimers();
  // Re-install every test so jest.clearAllMocks() cannot wipe the implementation.
  (global as any).WebSocket = jest.fn((url: string) => new MockWebSocket(url));
  MockWebSocket.last = null;
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Advance past the 50ms mount delay so the hook actually connects. */
function advancePastInitDelay() {
  act(() => { jest.advanceTimersByTime(55); });
}

// ─── Connection ───────────────────────────────────────────────────────────────

describe('useWebSocket — connection', () => {
  it('does NOT create a WebSocket when no token is in localStorage', () => {
    renderHook(() => useWebSocket());
    advancePastInitDelay();
    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('creates a WebSocket after the 50ms delay when a token exists', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();
    expect(global.WebSocket).toHaveBeenCalledTimes(1);
  });

  it('includes the token as a query param in the WebSocket URL', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();
    expect(MockWebSocket.last!.url).toContain(`token=${TOKEN}`);
  });

  it('includes the /api/v1/ws/notifications path in the URL', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();
    expect(MockWebSocket.last!.url).toContain('/api/v1/ws/notifications');
  });

  it('sets connected=true when onopen fires', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => { MockWebSocket.last!.triggerOpen(); });

    expect(result.current.connected).toBe(true);
  });

  it('starts with connected=false', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.connected).toBe(false);
  });
});

// ─── Ping / keepalive ─────────────────────────────────────────────────────────

describe('useWebSocket — ping keepalive', () => {
  it('responds to a server ping with a ping message', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ type: 'ping' });
    });

    expect(MockWebSocket.last!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' })
    );
  });

  it('does NOT add a notification for a ping message', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ type: 'ping' });
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('does NOT add a notification for a pong/connected message', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ type: 'pong' });
      MockWebSocket.last!.triggerMessage({ type: 'connected' });
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});

// ─── Incoming events → notifications ─────────────────────────────────────────

describe('useWebSocket — incoming events', () => {
  const DISASTER_EVENT = {
    event_type: 'disaster.updated',
    severity: 'HIGH',
    colour: 'orange',
    title: 'Disaster Updated',
    message: 'The fire on Grafton St has been updated.',
    data: { tracking_id: 'DRS-001' },
    timestamp: new Date().toISOString(),
  };

  it('adds a notification when a real event arrives', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(DISASTER_EVENT);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it('increments unreadCount for each new event', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(DISASTER_EVENT);
      MockWebSocket.last!.triggerMessage({ ...DISASTER_EVENT, title: 'Second event' });
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it('calls the onNotification callback with the parsed notification', () => {
    seedToken();
    const onNotification = jest.fn();
    renderHook(() => useWebSocket({ onNotification }));
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(DISASTER_EVENT);
    });

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification.mock.calls[0][0]).toMatchObject({
      eventType: 'disaster.updated',
      read: false,
    });
  });

  it('maps HIGH severity correctly', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ ...DISASTER_EVENT, severity: 'HIGH' });
    });

    expect(result.current.notifications[0].severity).toBe('high');
  });

  it('maps CRITICAL severity correctly', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ ...DISASTER_EVENT, severity: 'CRITICAL' });
    });

    expect(result.current.notifications[0].severity).toBe('critical');
  });

  it('falls back to info severity for unknown severity strings', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({ ...DISASTER_EVENT, severity: 'UNKNOWN_LEVEL' });
    });

    expect(result.current.notifications[0].severity).toBe('info');
  });

  it('silently ignores malformed (non-JSON) messages', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      // Fire a raw non-JSON message via the handler directly
      MockWebSocket.last!.onmessage?.({ data: 'this is not json {{{' } as MessageEvent);
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe('useWebSocket — markAllRead()', () => {
  const EVENT = {
    event_type: 'disaster.updated',
    severity: 'HIGH',
    title: 'Test',
    message: 'Test message',
    data: {},
    timestamp: new Date().toISOString(),
  };

  it('marks all notifications as read', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(EVENT);
      MockWebSocket.last!.triggerMessage({ ...EVENT, title: 'Second' });
    });

    act(() => { result.current.markAllRead(); });

    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it('resets unreadCount to 0', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(EVENT);
    });

    act(() => { result.current.markAllRead(); });

    expect(result.current.unreadCount).toBe(0);
  });
});

// ─── clearAll ────────────────────────────────────────────────────────────────

describe('useWebSocket — clearAll()', () => {
  const EVENT = {
    event_type: 'disaster.updated',
    severity: 'MEDIUM',
    title: 'Test',
    message: 'Test',
    data: {},
    timestamp: new Date().toISOString(),
  };

  it('empties the notifications array', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(EVENT);
    });

    act(() => { result.current.clearAll(); });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('resets unreadCount to 0', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(EVENT);
    });

    act(() => { result.current.clearAll(); });

    expect(result.current.unreadCount).toBe(0);
  });

  it('removes the notifications key from localStorage', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage(EVENT);
    });

    act(() => { result.current.clearAll(); });

    expect(localStorage.getItem('drs_notifications')).toBeNull();
  });
});

// ─── Reconnection ─────────────────────────────────────────────────────────────

describe('useWebSocket — reconnection', () => {
  it('schedules a reconnect after an abnormal close', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerClose(1006); // abnormal
    });

    const instanceAfterDrop = MockWebSocket.last;

    // Advance past the 3000ms reconnect delay
    act(() => { jest.advanceTimersByTime(3100); });

    // A new WebSocket should have been created
    expect(MockWebSocket.last).not.toBe(instanceAfterDrop);
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('sets connected=false immediately after close', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerClose(1006);
    });

    expect(result.current.connected).toBe(false);
  });
});

// ─── disconnect() ─────────────────────────────────────────────────────────────

describe('useWebSocket — disconnect()', () => {
  it('closes the WebSocket', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();
    act(() => { MockWebSocket.last!.triggerOpen(); });

    const ws = MockWebSocket.last!;
    act(() => { result.current.disconnect(); });

    expect(ws.close).toHaveBeenCalled();
  });

  it('does NOT reconnect after a manual disconnect', () => {
    seedToken();
    const { result } = renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
    });

    act(() => { result.current.disconnect(); });

    const callCountBeforeWait = (global.WebSocket as unknown as jest.Mock).mock.calls.length;

    act(() => { jest.advanceTimersByTime(10_000); });

    expect((global.WebSocket as unknown as jest.Mock).mock.calls.length).toBe(callCountBeforeWait);
  });
});

// ─── Persistence ─────────────────────────────────────────────────────────────

describe('useWebSocket — localStorage persistence', () => {
  it('saves notifications to localStorage after receiving an event', () => {
    seedToken();
    renderHook(() => useWebSocket());
    advancePastInitDelay();

    act(() => {
      MockWebSocket.last!.triggerOpen();
      MockWebSocket.last!.triggerMessage({
        event_type: 'disaster.updated',
        severity: 'HIGH',
        title: 'Persisted',
        message: 'Should be saved',
        data: {},
        timestamp: new Date().toISOString(),
      });
    });

    const saved = localStorage.getItem('drs_notifications');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});