// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/notificationStore.ts
//
// Persistent store for WS push notifications.
// Stores to AsyncStorage so notifications survive app restarts.
// AlertsScreen reads from here — it IS the notification inbox.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WSAlert } from './wsService';

const STORE_KEY    = '@notifications/alerts';
const MAX_STORE    = 50; // keep last 50 notifications

export interface StoredNotification extends WSAlert {
  isRead: boolean;
  storedAt: string; // ISO
  cachedRoutePts?: [number, number][];  // pre-fetched reroute geometry (avoids 404 on stale plans)
  cachedRouteMeta?: { time: number; dist: number } | null;
}

type ChangeHandler = (notifications: StoredNotification[]) => void;

class NotificationStore {
  private listeners: ChangeHandler[] = [];

  subscribe(handler: ChangeHandler): () => void {
    this.listeners.push(handler);
    return () => { this.listeners = this.listeners.filter(h => h !== handler); };
  }

  private notify(notifications: StoredNotification[]) {
    this.listeners.forEach(h => h(notifications));
  }

  async getAll(): Promise<StoredNotification[]> {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async add(alert: WSAlert): Promise<StoredNotification[]> {
    try {
      const existing = await this.getAll();
      const notification: StoredNotification = {
        ...alert,
        isRead:   false,
        storedAt: new Date().toISOString(),
      };
      // Prepend newest, trim to MAX_STORE
      const updated = [notification, ...existing].slice(0, MAX_STORE);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
      this.notify(updated);
      return updated;
    } catch { return []; }
  }

  async markAllRead(): Promise<void> {
    try {
      const existing = await this.getAll();
      const updated  = existing.map(n => ({ ...n, isRead: true }));
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
      this.notify(updated);
    } catch {}
  }

  async markRead(timestamp: string): Promise<void> {
    try {
      const existing = await this.getAll();
      const updated  = existing.map(n =>
        n.timestamp === timestamp ? { ...n, isRead: true } : n
      );
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
      this.notify(updated);
    } catch {}
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORE_KEY);
      this.notify([]);
    } catch {}
  }

  async unreadCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter(n => !n.isRead).length;
  }
}

export const notificationStore = new NotificationStore();
export default notificationStore;