// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/wsService.ts
// WebSocket real-time notification service — SINGLETON
//
// Dispatches every event to the global disasterStore:
//   - Every event → store.addAlert()  (persisted in Alerts page)
//   - disaster.evaluated → fetch active disasters, cache in store
//   - disaster.dispatched → update store in-place (no API)
//   - disaster.updated → fetch single disaster, merge into store
//   - disaster.resolved → move to resolved in store
//   - disaster.false_alarm → move to resolved + badge
//   - coordination.team_assigned → auto vehicle registration
//
// Connection: ws://host/api/v1/ws/notifications?token={access_token}
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { showLocalNotification } from './notificationService';
import { API_BASE_URL } from '@constants/index';
import { API, WS_URL } from './apiConfig';
import { disasterStore } from './disasterStore';
import type { WSAlert } from './disasterStore';

// WS base URL imported from apiConfig (strips /api/v1, swaps http→ws)

export type WSEventType =
  | 'disaster.evaluated'
  | 'disaster.verified'
  | 'disaster.resolved'
  | 'disaster.false_alarm'
  | 'disaster.updated'
  | 'disaster.dispatched'
  | 'disaster.backup_requested'
  | 'disaster.unit_completed'
  | 'disaster.cleared'
  | 'reroute.triggered'
  | 'route.updated'
  | 'vehicle.location_updated'
  | 'simulation.complete'
  | 'evacuation.triggered'
  | 'coordination.team_assigned'
  | 'coordination.escalation';

type AlertHandler  = (alert: WSAlert) => void;
type ConnectHandler = (connected: boolean) => void;

class WsService {
  private ws:            WebSocket | null = null;
  private pingInterval:  ReturnType<typeof setInterval> | null = null;
  private reconnectTimer:ReturnType<typeof setTimeout>  | null = null;
  private handlers:      AlertHandler[]   = [];
  private connectHandlers: ConnectHandler[] = [];
  private isResponder:   boolean = false;
  private currentLat:    number  = 53.3498;
  private currentLon:    number  = -6.2603;
  private reconnectDelay = 3000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = false;

  // ── Public API ────────────────────────────────────────────────────────

  onAlert(handler: AlertHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.push(handler);
    return () => { this.connectHandlers = this.connectHandlers.filter(h => h !== handler); };
  }

  updateLocation(lat: number, lon: number) {
    this.currentLat = lat;
    this.currentLon = lon;
    if (this.ws?.readyState === WebSocket.OPEN && !this.isResponder) {
      this._sendPing();
    }
  }

  async connect(responder = false) {
    this.isResponder     = responder;
    this.shouldReconnect = true;

    // Clear any stale API URL cached from old dev builds (e.g. localhost:8000)
    // The URL is always taken from the compiled constant now, not AsyncStorage
    await AsyncStorage.removeItem('@config/api_base_url').catch(() => {});

    let token = await this._getFreshToken();
    if (!token) { console.warn('[WS] No token — cannot connect'); return; }

    this._openConnection(token);
  }

  private async _getFreshToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@auth/access_token');
    if (!token) {
      console.warn('[WS] No access_token in storage — not logged in');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[WS] Stored token is malformed');
      return null;
    }

    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      const userType = payload.user_type ?? 'user';
      console.log('[WS] Token — type:', payload.type, '| user_type:', userType, '| sub:', payload.sub);

      if (payload.type !== 'access') {
        console.error('[WS] Token type is not "access":', payload.type);
        return null;
      }

      // Token expires within 60 seconds — try to refresh proactively
      if (payload.exp) {
        const secondsLeft = payload.exp - Date.now() / 1000;
        if (secondsLeft <= 0) {
          console.error('[WS] Token is expired — cannot connect');
          return null;
        }
        if (secondsLeft < 60) {
          console.warn('[WS] Token expires in', Math.round(secondsLeft), 's — trying refresh');
          try {
            const refreshToken = await AsyncStorage.getItem('@auth/refresh_token');
            if (refreshToken) {
              const API_BASE_URL_VAL = API_BASE_URL;
              const res = await fetch(`${API_BASE_URL_VAL}/auth/token/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });
              if (res.ok) {
                const data = await res.json();
                await AsyncStorage.setItem('@auth/access_token', data.access_token);
                console.log('[WS] Token refreshed successfully');
                return data.access_token;
              }
            }
          } catch (e) {
            console.warn('[WS] Token refresh failed — using existing token');
          }
        }
      }
    } catch (e) {
      console.warn('[WS] Could not decode token payload:', e);
    }

    return token;
  }

  disconnect() {
    this.shouldReconnect = false;
    this._clearTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._notifyConnect(false);
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private _openConnection(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}${API.notifications.ws()}?token=${token}`;
    console.log('[WS] Connecting:', url.replace(token, '***'));

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.warn('[WS] Failed to create WebSocket:', e);
      this._scheduleReconnect(token);
      return;
    }

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectDelay = 3000;
      this._notifyConnect(true);

      // Send location frame immediately on connect (all users).
      // Backend step 4 reads this within 15s to enable geo-targeting.
      // Also send a keepalive ping every 25s to stay within the backend's
      // 30s receive timeout — prevents silent disconnection.
      this._sendPing();
      this.pingInterval = setInterval(() => this._sendPing(), 25 * 1000);
    };

    this.ws.onmessage = (event) => {
      // Wrap in an immediately-invoked async function so we can await
      // addAlert (AsyncStorage write) and _dispatchToStore (fetch calls)
      // without making the onmessage handler itself async (which React Native
      // WebSocket doesn't support directly).
      void (async () => {
        try {
          const msg = JSON.parse(event.data);

          // Server keepalive ping — respond with client ping
          if (msg.type === 'ping') {
            this._sendPing();
            return;
          }

          // Server pong — no action needed
          if (msg.type === 'pong') return;

          // Real alert — must have event_type field
          if (!msg.event_type) return;

          const alert: WSAlert = msg as WSAlert;
          console.log('[WS] ▶ Alert received:', alert.event_type, '|', alert.severity, '|', alert.title);

          // ─── 1. Persist to store (awaited — ensures AsyncStorage write) ──
          await disasterStore.addAlert(alert);

          // ─── 2. Dispatch store mutations (awaited — ensures fetches complete) ─
          await this._dispatchToStore(alert);

          // ─── 3. Notify screen-level handlers (HomeScreen, ActiveMissions etc) ─
          this.handlers.forEach(h => h(alert));

          // ─── 4. Show Alert.alert for important events on ANY screen ──────
          // HomeScreen shows a banner when it's visible, but on other screens
          // we use Alert.alert so the user always sees critical notifications.
          this._showGlobalAlert(alert);

        } catch (e) {
          console.warn('[WS] onmessage error:', e);
        }
      })();
    };

    this.ws.onerror = (e) => {
      console.warn('[WS] Error:', e);
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
      this._clearTimers();
      this._notifyConnect(false);
      if (this.shouldReconnect) this._scheduleReconnect(token);
    };
  }

  /**
   * Central dispatcher — maps WS events to store mutations.
   * This is the ONLY place where store state is modified from WS events.
   */
  private async _dispatchToStore(alert: WSAlert) {
    const data = alert.data ?? {};
    const disasterId = data.disaster_id as string | undefined;

    switch (alert.event_type) {
      // ── disaster.evaluated: fetch full list, cache in store ──────
      case 'disaster.evaluated': {
        try {
          const token = await AsyncStorage.getItem('@auth/access_token');
          if (!token) break;
          const res = await fetch(`${API_BASE_URL}${API.disasters.active()}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            const json = await res.json();
            const list = json?.disasters ?? (Array.isArray(json) ? json : []);
            disasterStore.setActiveDisasters(list);
          }
        } catch (e) {
          console.warn('[WS dispatch] Failed to fetch active disasters:', e);
        }
        break;
      }

      // ── disaster.dispatched: update in-place, no API call ───────
      case 'disaster.dispatched': {
        if (disasterId) disasterStore.markDispatched(disasterId);
        break;
      }

      // ── disaster.updated: fetch single disaster, merge ──────────
      case 'disaster.updated': {
        if (!disasterId) break;
        try {
          const token = await AsyncStorage.getItem('@auth/access_token');
          if (!token) break;
          const res = await fetch(`${API_BASE_URL}${API.disasters.byId(disasterId)}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            const updated = await res.json();
            disasterStore.mergeDisasterUpdate(disasterId, updated);
          }
        } catch (e) {
          console.warn('[WS dispatch] Failed to fetch disaster update:', e);
        }
        break;
      }

      // ── disaster.resolved: move to resolved section ─────────────
      case 'disaster.resolved': {
        if (disasterId) disasterStore.resolveDisaster(disasterId);
        break;
      }

      // ── disaster.false_alarm: move to resolved + badge ──────────
      case 'disaster.false_alarm': {
        if (disasterId) disasterStore.markFalseAlarm(disasterId);
        break;
      }

      // ── coordination.team_assigned: auto vehicle registration ───
      case 'coordination.team_assigned': {
        try {
          const token = await AsyncStorage.getItem('@auth/access_token');
          const userData = await AsyncStorage.getItem('@auth/user_data');
          if (!token || !userData) break;
          const user = JSON.parse(userData);
          // Auto-register vehicle as "emergency"
          const res = await fetch(`${API_BASE_URL}${API.vehicles.register()}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id:      user.id,
              current_lat:  53.3498,  // Dublin default — ideally use device GPS
              current_lng:  -6.2603,
              dest_lat:     data.disaster_lat ?? 53.35,
              dest_lng:     data.disaster_lng ?? -6.26,
              vehicle_type: 'emergency',
            }),
          });
          if (res.ok) {
            const reg = await res.json();
            disasterStore.setVehicleRegistration({
              registered:    true,
              user_id:       reg.user_id,
              vehicle_type:  reg.vehicle_type,
              dest_lat:      reg.dest_lat,
              dest_lng:      reg.dest_lng,
              expires_at:    reg.expires_at,
            });
            console.log('[WS dispatch] Vehicle registered as emergency');
          }
        } catch (e) {
          console.warn('[WS dispatch] Vehicle registration failed:', e);
        }
        break;
      }

      // ── disaster.verified, disaster.backup_requested,
      //    disaster.unit_completed, reroute.triggered,
      //    route.updated, disaster.cleared, vehicle.location_updated,
      //    coordination.escalation, evacuation.triggered
      //    → no store mutation needed beyond the alert (which is already added)
      //    → screen-level handlers deal with these via onAlert()
      default:
        break;
    }
  }

  private _sendPing() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    // Always include lat/lon — backend uses it for geo-targeting for both
    // citizens and responders. Without it, the backend marks geo-targeting
    // as disabled for this user and they may miss location-scoped alerts.
    this.ws.send(JSON.stringify({
      type: 'ping',
      lat:  this.currentLat,
      lon:  this.currentLon,
    }));
  }

  private _showGlobalAlert(alert: WSAlert) {
    const et       = alert.event_type;
    const severity = alert.severity ?? 'INFO';
    const title    = alert.title   ?? 'DRS Alert';
    const message  = alert.message ?? '';

    // Use the isResponder flag set during connect() — no AsyncStorage read needed
    const isResponder = this.isResponder;

    // Citizen-only events — never show to responders
    const CITIZEN_EVENTS: Record<string, string> = {
      'disaster.evaluated':   '⚠️ Disaster Alert',
      'disaster.verified':    '✅ Disaster Verified',
      'disaster.resolved':    '✅ Disaster Resolved',
      'disaster.false_alarm': 'ℹ️ False Alarm',
      'evacuation.triggered': '🚨 Evacuation Activated',
      'evacuation.updated':   '🔄 Evacuation Updated',
      'reroute.triggered':    '🗺️ Route Change',
      'route.updated':        '🔄 Route Updated',
    };

    // Responder-only events — never show to citizens
    const RESPONDER_EVENTS: Record<string, string> = {
      'disaster.dispatched':        '🚨 Dispatched to Disaster',
      'disaster.updated':           '🔄 Disaster Updated',
      'disaster.backup_requested':  '🆘 Backup Requested',
      'disaster.unit_completed':    '✅ Mission Complete',
      'coordination.escalation':    '⚠️ Escalation',
      'coordination.team_assigned': '👥 Team Assigned',
    };

    // Pick the right title based on role
    let notifTitle: string | undefined;
    if (isResponder) {
      notifTitle = RESPONDER_EVENTS[et] ?? CITIZEN_EVENTS[et];
    } else {
      notifTitle = CITIZEN_EVENTS[et]; // citizens never see responder events
    }

    if (!notifTitle) return; // event not relevant to this user's role

    // Build notification data for deep linking on tap
    const notifData: Record<string, string> = {
      event_type: et,
      severity,
    };
    const alertData = alert.data ?? {};
    if (alertData.disaster_id) notifData.disaster_id = String(alertData.disaster_id);

    // Show local push notification — appears on any screen, even background
    showLocalNotification(
      notifTitle,
      message || title,
      severity,
      notifData,
    ).catch(() => {
      Alert.alert(notifTitle!, message || title, [{ text: 'OK' }]);
    });
  }

  private _scheduleReconnect(token: string) {
    this.reconnectTimer = setTimeout(() => {
      console.log('[WS] Reconnecting...');
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this._openConnection(token);
    }, this.reconnectDelay);
  }

  private _clearTimers() {
    if (this.pingInterval)  { clearInterval(this.pingInterval);  this.pingInterval  = null; }
    if (this.reconnectTimer){ clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private _notifyConnect(connected: boolean) {
    this.connectHandlers.forEach(h => h(connected));
  }
}

// Singleton
export const wsService = new WsService();
export default wsService;