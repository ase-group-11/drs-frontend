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
import { API_BASE_URL } from '@constants/index';
import { disasterStore } from './disasterStore';
import type { WSAlert } from './disasterStore';

// Convert http(s) base URL to ws(s)
const WS_BASE = API_BASE_URL
  .replace(/^http/, 'ws')
  .replace(/\/api\/v1\/?$/, '');

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

    let token = await this._getFreshToken();
    if (!token) { console.warn('[WS] No token — cannot connect'); return; }

    this._openConnection(token);
  }

  private async _getFreshToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@auth/access_token');
    if (!token) {
      console.warn('[WS] No access_token in storage');
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
      console.log('[WS] Token payload — type:', payload.type, 'user_type:', payload.user_type);

      if (payload.type !== 'access') {
        console.error('[WS] Token type is not "access":', payload.type);
        return null;
      }

      if (payload.exp && Date.now() / 1000 > payload.exp) {
        console.error('[WS] Token is expired');
        return null;
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

    const url = `${WS_BASE}/api/v1/ws/notifications?token=${token}`;
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

      if (!this.isResponder) {
        this._sendPing();
        this.pingInterval = setInterval(() => this._sendPing(), 3 * 60 * 1000);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Server keepalive ping — respond
        if (msg.type === 'ping') {
          this._sendPing();
          return;
        }

        // Real alert — dispatch to store and handlers
        if (msg.event_type) {
          const alert: WSAlert = msg as WSAlert;
          console.log('[WS] Alert:', alert.event_type, alert.severity);

          // ─── GLOBAL RULE: persist every event as alert ─────────
          disasterStore.addAlert(alert);

          // ─── Dispatch to store based on event_type ─────────────
          this._dispatchToStore(alert);

          // ─── Notify screen-level handlers ──────────────────────
          this.handlers.forEach(h => h(alert));
        }
      } catch {
        // Non-JSON frame — ignore
      }
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
          const res = await fetch(`${API_BASE_URL}/disasters/active?limit=50`, {
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
          const res = await fetch(`${API_BASE_URL}/disasters/${disasterId}`, {
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
          const res = await fetch(`${API_BASE_URL}/vehicles/register`, {
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
    const frame: any = { type: 'ping' };
    if (!this.isResponder) {
      frame.lat = this.currentLat;
      frame.lon = this.currentLon;
    }
    this.ws.send(JSON.stringify(frame));
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