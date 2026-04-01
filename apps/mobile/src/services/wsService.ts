// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/wsService.ts
// WebSocket real-time notification service
// Citizen:  sends location ping every 3 min for geo-targeting
// Responder: no location ping needed (role-based delivery)
//
// Connection: ws://host/api/v1/ws/notifications?token={access_token}
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@constants/index';

// Convert http(s) base URL to ws(s)
// API_BASE_URL already contains /api/v1 — strip it so we don't double-up
// e.g. http://localhost:8000/api/v1  →  ws://localhost:8000
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

export interface WSAlert {
  service:    string;
  event_type: WSEventType;
  severity:   'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  colour:     string;
  title:      string;
  message:    string;
  data:       Record<string, any>;
  timestamp:  string;
}

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

  // ── Public API ────────────────────────────────────────────────────────────

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
    // Immediately send updated location if connected and citizen
    if (this.ws?.readyState === WebSocket.OPEN && !this.isResponder) {
      this._sendPing();
    }
  }

  async connect(responder = false) {
    this.isResponder     = responder;
    this.shouldReconnect = true;

    // Always try to get a fresh token — expired tokens cause 403 on WS upgrade
    let token = await this._getFreshToken();
    if (!token) { console.warn('[WS] No token — cannot connect'); return; }

    this._openConnection(token);
  }

  /** Get stored access token — tokens are 1-year lived so no refresh needed */
  private async _getFreshToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@auth/access_token');
    if (!token) {
      console.warn('[WS] No access_token in storage');
      return null;
    }

    // Basic sanity check — JWT should have 3 dot-separated parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[WS] Stored token is malformed (not a JWT):', token.substring(0, 20) + '...');
      return null;
    }

    // Decode the payload to check expiry and type
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      console.log('[WS] Token payload — type:', payload.type, 'user_type:', payload.user_type, 'sub:', payload.sub?.substring(0,8));

      // Backend requires payload.type === "access"
      if (payload.type !== 'access') {
        console.error('[WS] Token type is not "access":', payload.type);
        return null;
      }

      // Check expiry
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        console.error('[WS] Token is expired. exp:', new Date(payload.exp * 1000).toISOString());
        return null;
      }
    } catch (e) {
      console.warn('[WS] Could not decode token payload:', e);
      // Still try — server will reject if truly invalid
    }

    return token;
  }

  disconnect() {
    this.shouldReconnect = false;
    this._clearTimers();
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this._notifyConnect(false);
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

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
      this.reconnectDelay = 3000; // reset backoff
      this._notifyConnect(true);

      // Send initial location ping (citizen only)
      if (!this.isResponder) {
        this._sendPing();
        // Repeat every 3 minutes
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

        // Real alert
        if (msg.event_type) {
          const alert: WSAlert = msg as WSAlert;
          console.log('[WS] Alert:', alert.event_type, alert.severity);
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