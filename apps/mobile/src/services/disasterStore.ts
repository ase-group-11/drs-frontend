// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/disasterStore.ts
// Global state store for: active disasters, alerts, vehicle registration,
// active missions. Singleton — shared across all screens.
//
// Implements the spec requirement:
//   "Use a global state store to hold: active disasters, alerts list,
//    vehicle registration state, and active missions."
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Severity → Colour mapping (Section 12 of ERT doc) ────────────────────
export const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', // red
  HIGH:     '#f97316', // orange
  MEDIUM:   '#eab308', // yellow
  LOW:      '#3b82f6', // blue
  INFO:     '#22c55e', // green
};

export const COLOUR_MAP: Record<string, string> = {
  red:    '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  blue:   '#3b82f6',
  green:  '#22c55e',
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface WSAlert {
  service:    string;
  event_type: string;
  severity:   'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  colour:     string;
  title:      string;
  message:    string;
  data:       Record<string, any>;
  timestamp:  string;
}

export interface StoredAlert extends WSAlert {
  id:        string;
  isRead:    boolean;
  storedAt:  string;
}

export interface ActiveDisaster {
  id:                 string;
  tracking_id:        string;
  type:               string;
  severity:           string;
  disaster_status:    string;
  location_address:   string;
  location:           { lat: number; lon: number };
  people_affected:    number;
  assigned_department?: string;
  description?:       string;
  created_at?:        string;
  // UI-only fields
  _falseAlarm?:       boolean;
}

export interface VehicleRegistration {
  registered: boolean;
  user_id?:   string;
  vehicle_type?: string;
  dest_lat?:  number;
  dest_lng?:  number;
  expires_at?: string;
}

export interface ActiveMission {
  id:               string;
  deployment_id?:   string;
  disaster_id:      string;
  deployment_status: string;
  priority_level:   string;
  disaster?: {
    id:               string;
    tracking_id:      string;
    type:             string;
    severity:         string;
    location_address: string;
    location:         { lat: number; lon: number };
  };
  eta_minutes?:     number;
  timeline?:        Record<string, string>;
  unit_id?:         string;
}

// ── Store state shape ─────────────────────────────────────────────────────

interface StoreState {
  // Active disasters — cached from GET /disasters/active, only refreshed
  // on disaster.evaluated. Other events mutate in-place.
  activeDisasters:    ActiveDisaster[];
  resolvedDisasters:  ActiveDisaster[];   // moved here on disaster.resolved / false_alarm

  // Every WS event persisted as an alert
  alerts:             StoredAlert[];

  // Vehicle registration state
  vehicle:            VehicleRegistration;

  // Active missions for this unit
  activeMissions:     ActiveMission[];
}

type Listener = () => void;

const ALERTS_KEY  = '@store/alerts';
const MAX_ALERTS  = 100;

// ── Singleton store ───────────────────────────────────────────────────────

class DisasterStore {
  private state: StoreState = {
    activeDisasters:   [],
    resolvedDisasters: [],
    alerts:            [],
    vehicle:           { registered: false },
    activeMissions:    [],
  };

  private listeners: Set<Listener> = new Set();

  // ── Subscribe / get ────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getState(): Readonly<StoreState> {
    return this.state;
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // ── Disasters ──────────────────────────────────────────────────────────

  /** Called ONLY on `disaster.evaluated` — full refresh from API response */
  setActiveDisasters(disasters: ActiveDisaster[]) {
    this.state = { ...this.state, activeDisasters: disasters };
    this.notify();
  }

  /** On `disaster.dispatched` — update status in-place, NO API call */
  markDispatched(disasterId: string) {
    this.state = {
      ...this.state,
      activeDisasters: this.state.activeDisasters.map(d =>
        d.id === disasterId
          ? { ...d, disaster_status: 'DISPATCHED' }
          : d
      ),
    };
    this.notify();
  }

  /** On `disaster.updated` — merge updated fields from API response */
  mergeDisasterUpdate(disasterId: string, updated: Partial<ActiveDisaster>) {
    this.state = {
      ...this.state,
      activeDisasters: this.state.activeDisasters.map(d =>
        d.id === disasterId ? { ...d, ...updated } : d
      ),
    };
    this.notify();
  }

  /** On `disaster.resolved` — move to resolved section */
  resolveDisaster(disasterId: string) {
    const disaster = this.state.activeDisasters.find(d => d.id === disasterId);
    if (!disaster) return;
    this.state = {
      ...this.state,
      activeDisasters:  this.state.activeDisasters.filter(d => d.id !== disasterId),
      resolvedDisasters: [
        { ...disaster, disaster_status: 'RESOLVED' },
        ...this.state.resolvedDisasters,
      ],
    };
    this.notify();
  }

  /** On `disaster.false_alarm` — move to resolved with badge */
  markFalseAlarm(disasterId: string) {
    const disaster = this.state.activeDisasters.find(d => d.id === disasterId);
    if (!disaster) return;
    this.state = {
      ...this.state,
      activeDisasters:  this.state.activeDisasters.filter(d => d.id !== disasterId),
      resolvedDisasters: [
        { ...disaster, disaster_status: 'REJECTED', _falseAlarm: true },
        ...this.state.resolvedDisasters,
      ],
    };
    this.notify();
  }

  // ── Alerts (every WS event) ────────────────────────────────────────────

  async addAlert(wsAlert: WSAlert) {
    // Dedup guard: if an alert with the same timestamp + event_type already
    // exists, skip it. This prevents double-adds if HomeScreen handlers also
    // call addAlert (belt-and-suspenders protection).
    const isDuplicate = this.state.alerts.some(
      a => a.timestamp === wsAlert.timestamp && a.event_type === wsAlert.event_type
    );
    if (isDuplicate) {
      console.log('[Store] Skipping duplicate alert:', wsAlert.event_type);
      return;
    }

    const stored: StoredAlert = {
      ...wsAlert,
      id:       `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isRead:   false,
      storedAt: new Date().toISOString(),
    };
    const updated = [stored, ...this.state.alerts].slice(0, MAX_ALERTS);
    this.state = { ...this.state, alerts: updated };

    // Persist FIRST, then notify — ensures subscribers see consistent state
    try {
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[Store] Failed to persist alert:', e);
    }

    // Notify AFTER persist so AlertsScreen renders fully committed data
    this.notify();
  }

  async loadPersistedAlerts() {
    try {
      const raw = await AsyncStorage.getItem(ALERTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with any alerts already in memory (arrived while loading)
          // Keep the in-memory ones (newer) at the front
          const inMemoryIds = new Set(this.state.alerts.map(a => a.id));
          const fromDisk = parsed.filter((a: StoredAlert) => !inMemoryIds.has(a.id));
          const merged = [...this.state.alerts, ...fromDisk].slice(0, MAX_ALERTS);
          this.state = { ...this.state, alerts: merged };
          this.notify();
          console.log('[Store] Loaded', fromDisk.length, 'alerts from disk, total:', merged.length);
        }
      }
    } catch (e) {
      console.warn('[Store] Failed to load persisted alerts:', e);
    }
  }

  markAlertRead(alertId: string) {
    const updated = this.state.alerts.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    );
    this.state = { ...this.state, alerts: updated };
    this.notify();
    // Persist
    try { AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated)); } catch {}
  }

  markAllAlertsRead() {
    const updated = this.state.alerts.map(a => ({ ...a, isRead: true }));
    this.state = { ...this.state, alerts: updated };
    this.notify();
    // Persist
    try { AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated)); } catch {}
  }

  get unreadCount(): number {
    return this.state.alerts.filter(a => !a.isRead).length;
  }

  clearAlerts() {
    this.state = { ...this.state, alerts: [] };
    this.notify();
    try { AsyncStorage.removeItem(ALERTS_KEY); } catch {}
  }

  // ── Vehicle registration ───────────────────────────────────────────────

  setVehicleRegistration(reg: VehicleRegistration) {
    this.state = { ...this.state, vehicle: reg };
    this.notify();
  }

  // ── Active missions ────────────────────────────────────────────────────

  setActiveMissions(missions: ActiveMission[]) {
    this.state = { ...this.state, activeMissions: missions };
    this.notify();
  }

  updateMissionStatus(deploymentId: string, newStatus: string) {
    this.state = {
      ...this.state,
      activeMissions: this.state.activeMissions.map(m =>
        (m.id === deploymentId || m.deployment_id === deploymentId)
          ? { ...m, deployment_status: newStatus }
          : m
      ),
    };
    this.notify();
  }

  removeMission(deploymentId: string) {
    this.state = {
      ...this.state,
      activeMissions: this.state.activeMissions.filter(
        m => m.id !== deploymentId && m.deployment_id !== deploymentId
      ),
    };
    this.notify();
  }
}

// Export singleton
export const disasterStore = new DisasterStore();
export default disasterStore;