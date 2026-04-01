import { useEffect, useRef, useCallback, useState } from 'react';

// ─── Actual backend message shape ────────────────────────────────────────────
// {"service":"disaster","event_type":"disaster.resolved","severity":"INFO",
//  "colour":"green","title":"Disaster resolved — DRS-TEST-003",
//  "message":"testing","data":{...},"timestamp":"2026-..."}

export interface WsEvent {
  type?: string;           // ping / pong / connected
  event_type?: string;     // real event name e.g. "disaster.resolved"
  service?: string;        // "disaster" | "reroute" | etc.
  severity?: string;       // "INFO" | "HIGH" | "CRITICAL" etc. (uppercase from backend)
  colour?: string;         // "green" | "red" | "orange" etc.
  title?: string;          // human-readable title from backend
  message?: string;        // detail message from backend
  data?: Record<string, any>;
  timestamp?: string;
}

// ─── Notification shape we store in state ────────────────────────────────────

export interface AppNotification {
  id: string;
  eventType: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: Date;
  read: boolean;
  raw: WsEvent;
}

// ─── Severity mapping (backend sends uppercase) ───────────────────────────────

function mapSeverity(raw?: string): AppNotification['severity'] {
  switch ((raw ?? '').toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH':     return 'high';
    case 'MEDIUM':   return 'medium';
    case 'LOW':      return 'low';
    default:         return 'info';   // INFO, SUCCESS, green, etc.
  }
}

// ─── Colour → severity fallback (when severity field is absent) ───────────────

function colourToSeverity(colour?: string): AppNotification['severity'] {
  switch ((colour ?? '').toLowerCase()) {
    case 'red':    return 'critical';
    case 'orange': return 'high';
    case 'yellow': return 'medium';
    case 'blue':   return 'low';
    default:       return 'info';
  }
}

// ─── Event type → display config ─────────────────────────────────────────────
// Description fallback only — backend title/message used when available

const EVENT_CONFIG: Record<string, {
  titleFallback: string;
  severity: AppNotification['severity'];
  getDescription: (data: any, msg?: string) => string;
}> = {
  'disaster.updated': {
    titleFallback: 'Disaster Updated',
    severity: 'medium',
    getDescription: (d, msg) => msg ?? `${d?.tracking_id ?? 'Disaster'} has been updated`,
  },
  'disaster.evaluated': {
    titleFallback: 'Disaster Evaluated',
    severity: 'high',
    getDescription: (d, msg) => msg ?? `Severity: ${d?.severity ?? 'unknown'}`,
  },
  'disaster.dispatched': {
    titleFallback: 'Units Dispatched',
    severity: 'high',
    getDescription: (d, msg) => msg ?? `Units dispatched to ${d?.tracking_id ?? 'incident'}`,
  },
  'disaster.verified': {
    titleFallback: 'Disaster Verified',
    severity: 'high',
    getDescription: (d, msg) => msg ?? `${d?.tracking_id ?? 'Disaster'} verified and activated`,
  },
  'disaster.resolved': {
    titleFallback: 'Disaster Resolved',
    severity: 'info',
    getDescription: (d, msg) => msg ?? `${d?.tracking_id ?? 'Disaster'} has been resolved`,
  },
  'disaster.false_alarm': {
    titleFallback: 'False Alarm',
    severity: 'low',
    getDescription: (d, msg) => msg ?? `${d?.tracking_id ?? 'Report'} marked as false alarm`,
  },
  'disaster.backup_requested': {
    titleFallback: 'Backup Requested',
    severity: 'critical',
    getDescription: (d, msg) => msg ?? `Backup requested at ${d?.tracking_id ?? 'active incident'}`,
  },
  'reroute.triggered': {
    titleFallback: 'Traffic Reroute Triggered',
    severity: 'medium',
    getDescription: (d, msg) => msg ?? `Reroute active — ${d?.vehicles_affected ?? '?'} vehicles affected`,
  },
  'route.updated': {
    titleFallback: 'Route Updated',
    severity: 'low',
    getDescription: (d, msg) => msg ?? `Route plan updated for ${d?.disaster_id ?? 'incident'}`,
  },
  'disaster.cleared': {
    titleFallback: 'Roads Cleared',
    severity: 'info',
    getDescription: (d, msg) => msg ?? `Road blocks cleared for ${d?.disaster_id ?? 'incident'}`,
  },
  'vehicle.location_updated': {
    titleFallback: 'Vehicle Position Update',
    severity: 'low',
    getDescription: (d, msg) => msg ?? `${d?.vehicles?.length ?? 'Vehicle'} position(s) updated`,
  },
  'simulation.complete': {
    titleFallback: 'Simulation Complete',
    severity: 'info',
    getDescription: (d, msg) => msg ?? `Demo simulation finished for ${d?.disaster_id ?? 'incident'}`,
  },
};

function parseEvent(raw: WsEvent): AppNotification | null {
  // Only pong/ping/connected are system-level — skip silently
  const sysType = (raw.type ?? '').toLowerCase();
  if (sysType === 'ping' || sysType === 'pong' || sysType === 'connected') return null;

  const eventType = raw.event_type || raw.type || '';
  if (!eventType) return null;

  const config = EVENT_CONFIG[eventType];
  if (!config) {
    console.warn('[WS] Unrecognised event type:', eventType, '— raw:', raw);
  }

  const data = raw.data ?? {};

  // Use backend-provided title first, fall back to our config, then the event type itself
  const title = raw.title ?? config?.titleFallback ?? eventType;

  // Use backend message as description if provided; otherwise use config getDescription
  const description = config?.getDescription(data, raw.message) ?? raw.message ?? eventType;

  // Resolve severity: backend severity field → colour field → config default
  const severity = raw.severity
    ? mapSeverity(raw.severity)
    : raw.colour
    ? colourToSeverity(raw.colour)
    : (config?.severity ?? 'info');

  return {
    id: `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    title,
    description,
    severity,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    read: false,
    raw,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS   = 100;
const STORAGE_KEY         = 'drs_notifications';
const RECONNECT_DELAY_MS  = 3000;
const MAX_RECONNECT_TRIES = 10;

// ── Persistence helpers ──────────────────────────────────────────────────────

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<AppNotification, 'timestamp'> & { timestamp: string }>;
    // Re-hydrate Date objects (JSON.parse returns strings)
    return parsed.map((n) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage quota exceeded — trim and retry
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 20)));
    } catch { /* give up */ }
  }
}

interface UseWebSocketOptions {
  onNotification?: (n: AppNotification) => void;
}

export function useWebSocket({ onNotification }: UseWebSocketOptions = {}) {
  // Initialise from localStorage so notifications survive page refresh
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadFromStorage());
  const [connected, setConnected]         = useState(false);
  const [unreadCount, setUnreadCount]     = useState<number>(
    () => loadFromStorage().filter((n) => !n.read).length
  );

  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTries  = useRef(0);
  const isMounted       = useRef(true);
  const onNotifRef      = useRef(onNotification);
  onNotifRef.current    = onNotification;

  const getWsUrl = useCallback((): string | null => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    // Convert http(s):// → ws(s)://  and strip /api/v1 suffix if needed
    const base = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1')
      .replace(/^http/, 'ws')
      .replace(/\/api\/v1\/?$/, '');       // strip trailing /api/v1

    return `${base}/api/v1/ws/notifications?token=${token}`;
  }, []);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    const url = getWsUrl();
    if (!url) {
      console.warn('[WS] No token — skipping connection');
      return;
    }

    console.log('[WS] Connecting to:', url);

    // Close existing connection cleanly
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      console.log('[WS] Connected ✓');
      setConnected(true);
      reconnectTries.current = 0;
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      console.log('[WS] Raw message:', event.data);
      try {
        const raw: WsEvent = JSON.parse(event.data);
        console.log('[WS] Parsed:', raw);

        // Respond to server keepalive ping
        if (raw.type === 'ping') {
          ws.send(JSON.stringify({ type: 'ping' }));
          return;
        }

        const notification = parseEvent(raw);
        console.log('[WS] Notification result:', notification);
        if (!notification) {
          console.log('[WS] Skipped (no match for type:', raw.type || raw.event_type, ')');
          return;
        }

        setNotifications((prev) => {
          const next = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
          saveToStorage(next);
          return next;
        });
        setUnreadCount((c) => c + 1);
        onNotifRef.current?.(notification);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err, event.data);
      }
    };

    ws.onclose = (event) => {
      if (!isMounted.current) return;
      console.warn('[WS] Disconnected — code:', event.code, 'reason:', event.reason);
      setConnected(false);

      if (reconnectTries.current < MAX_RECONNECT_TRIES) {
        reconnectTries.current += 1;
        console.log(`[WS] Reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${reconnectTries.current})`);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [getWsUrl]);

  // Connect on mount, disconnect on unmount.
  // StrictMode: mount → cleanup → remount. We delay the connect slightly so the
  // cleanup from the first mount can cancel it before it opens a socket.
  const hasConnected = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    if (hasConnected.current) return;

    // Small delay lets StrictMode's cleanup cancel this before a socket opens
    const initTimer = setTimeout(() => {
      if (!isMounted.current) return;
      hasConnected.current = true;
      connect();
    }, 50);

    return () => {
      clearTimeout(initTimer);
      isMounted.current = false;
      hasConnected.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveToStorage(next);
      return next;
    });
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Dev helper: call window.__drsTestNotif('event.type') in the console to inject a realistic fake event
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const MOCK_PAYLOADS: Record<string, WsEvent> = {
      'disaster.resolved': {
        service: 'disaster',
        event_type: 'disaster.resolved',
        severity: 'INFO',
        colour: 'green',
        title: 'Disaster resolved — DRS-TEST-003',
        message: 'Fire fully contained. All units returned to base.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          tracking_id: 'DRS-TEST-003',
          resolution_notes: 'Fire fully contained. All units returned to base.',
          resolved_time: new Date().toISOString(),
        },
      },
      'disaster.dispatched': {
        service: 'disaster',
        event_type: 'disaster.dispatched',
        severity: 'HIGH',
        colour: 'orange',
        title: 'Units dispatched — DRS-TEST-004',
        message: '3 units dispatched to incident.',
        data: {
          disaster_id: 'dddddddd-0004-0004-0004-dddddddddddd',
          tracking_id: 'DRS-TEST-004',
          unit_ids: ['unit-001', 'unit-002', 'unit-003'],
          unit_codes: ['F-01', 'A-02', 'P-03'],
          priority_level: 'HIGH',
          dispatched_at: new Date().toISOString(),
        },
      },
      'disaster.evaluated': {
        service: 'disaster',
        event_type: 'disaster.evaluated',
        severity: 'HIGH',
        colour: 'orange',
        title: 'Disaster evaluated — DRS-TEST-005',
        message: 'Evaluation complete. Severity: HIGH. Confidence: 0.87.',
        data: {
          disaster_id: 'eeeeeeee-0005-0005-0005-eeeeeeeeeeee',
          tracking_id: 'DRS-TEST-005',
          disaster_type: 'FLOOD',
          severity: 'HIGH',
          confidence: 0.87,
          impact_radius_km: 2.4,
          trigger_deploy: true,
          trigger_reroute: true,
          recommended_services: ['FIRE', 'MEDICAL'],
        },
      },
      'disaster.verified': {
        service: 'disaster',
        event_type: 'disaster.verified',
        severity: 'HIGH',
        colour: 'orange',
        title: 'Disaster verified — DRS-TEST-006',
        message: 'Report verified and disaster activated.',
        data: {
          disaster_id: 'ffffffff-0006-0006-0006-ffffffffffff',
          tracking_id: 'DRS-TEST-006',
          disaster_type: 'FIRE',
          location: 'O\'Connell Street, Dublin 1',
          verified_by: 'Admin User',
        },
      },
      'disaster.false_alarm': {
        service: 'disaster',
        event_type: 'disaster.false_alarm',
        severity: 'LOW',
        colour: 'blue',
        title: 'False alarm — DRS-TEST-007',
        message: 'Report reviewed and marked as false alarm.',
        data: {
          disaster_id: 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
          tracking_id: 'DRS-TEST-007',
          reason: 'Duplicate report — already covered by DRS-TEST-003',
          reviewed_by: 'Admin User',
        },
      },
      'disaster.backup_requested': {
        service: 'disaster',
        event_type: 'disaster.backup_requested',
        severity: 'CRITICAL',
        colour: 'red',
        title: 'Backup requested — DRS-TEST-008',
        message: 'Unit F-01 requesting immediate backup on scene.',
        data: {
          disaster_id: 'bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb',
          tracking_id: 'DRS-TEST-008',
          requesting_unit: 'F-01',
          backup_type: 'IMMEDIATE',
          situation_report: 'Structure unstable. Casualties confirmed. Need additional medical units.',
        },
      },
      'reroute.triggered': {
        service: 'reroute',
        event_type: 'reroute.triggered',
        severity: 'MEDIUM',
        colour: 'yellow',
        title: 'Traffic reroute triggered',
        message: 'Reroute active. 47 vehicles affected.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          vehicles_affected: 47,
          impact_radius_km: 1.8,
          blocked_roads: ['Dawson Street', 'Nassau Street'],
          routes_assigned: 3,
        },
      },
      'route.updated': {
        service: 'reroute',
        event_type: 'route.updated',
        severity: 'LOW',
        colour: 'blue',
        title: 'Route plan updated',
        message: 'Alternative route recalculated due to new blockage.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          reason: 'New road blockage detected on Grafton Street',
          affected_zones: ['zone_city_centre'],
          routes_recalculated: 1,
        },
      },
      'disaster.cleared': {
        service: 'reroute',
        event_type: 'disaster.cleared',
        severity: 'INFO',
        colour: 'green',
        title: 'Roads cleared',
        message: 'All blocked roads reopened. Traffic restored.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          tracking_id: 'DRS-TEST-003',
          cleared_roads: ['Dawson Street', 'Nassau Street'],
          cleared_at: new Date().toISOString(),
        },
      },
      'simulation.complete': {
        service: 'reroute',
        event_type: 'simulation.complete',
        severity: 'INFO',
        colour: 'green',
        title: 'Simulation complete',
        message: 'All 47 simulated vehicles reached their destinations.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          vehicles_completed: 47,
          duration_seconds: 42,
        },
      },
      'vehicle.location_updated': {
        service: 'reroute',
        event_type: 'vehicle.location_updated',
        severity: 'LOW',
        colour: 'blue',
        title: 'Vehicle positions updated',
        message: '3 vehicle positions updated.',
        data: {
          disaster_id: 'cccccccc-0003-0003-0003-cccccccccccc',
          vehicles: [
            { user_id: 'v-001', lat: 53.3412, lng: -6.2594, step: 3 },
            { user_id: 'v-002', lat: 53.3398, lng: -6.2611, step: 5 },
          ],
        },
      },
    };

    (window as any).__drsTestNotif = (eventType = 'disaster.dispatched') => {
      const payload = MOCK_PAYLOADS[eventType];
      if (!payload) {
        console.warn('[WS] No mock payload for event type:', eventType);
        console.info('[WS] Available types:', Object.keys(MOCK_PAYLOADS).join(', '));
        return;
      }
      const raw: WsEvent = { ...payload, timestamp: new Date().toISOString() };
      const n = parseEvent(raw);
      if (!n) { console.warn('[WS] parseEvent returned null for:', eventType); return; }
      setNotifications((prev) => { const next = [n, ...prev].slice(0, MAX_NOTIFICATIONS); saveToStorage(next); return next; });
      setUnreadCount((c) => c + 1);
      onNotifRef.current?.(n);
      console.log('[WS] Injected realistic test notification:', n);
    };

    console.info('[WS] Dev helper ready — run window.__drsTestNotif(\'event.type\') to test');
    console.info('[WS] Available types: disaster.resolved, disaster.dispatched, disaster.evaluated, disaster.verified, disaster.false_alarm, disaster.backup_requested, reroute.triggered, route.updated, disaster.cleared, simulation.complete, vehicle.location_updated');
    return () => { delete (window as any).__drsTestNotif; };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTries.current = MAX_RECONNECT_TRIES; // prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    console.log('[WS] Manually disconnected');
  }, []);

  const reconnect = useCallback(() => {
    reconnectTries.current = 0; // reset so auto-reconnect works again
    connect();
    console.log('[WS] Manually reconnecting');
  }, [connect]);

  return { notifications, connected, unreadCount, markAllRead, clearAll, disconnect, reconnect };
}