// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/notificationStore.ts
//
// Persists reroute geometry alongside WS alerts so AlertsScreen can
// draw the route without re-fetching from an expired backend plan.
//
// HomeScreen writes cachedRoutePts when reroute.triggered arrives.
// AlertsScreen reads cachedRoutePts when user taps a reroute alert.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WSAlert } from './disasterStore';

const STORAGE_KEY = '@notifications/alerts';
const MAX_STORED  = 100;

export interface StoredNotification extends WSAlert {
  id:               string;
  storedAt:         string;
  // Pre-fetched route geometry (written while backend plan is still active)
  cachedRoutePts?:  [number, number][];
  cachedRouteMeta?: { time: number; dist: number } | null;
}

export async function getAll(): Promise<StoredNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[NotifStore] getAll failed:', e);
    return [];
  }
}

export async function saveNotification(alert: WSAlert): Promise<StoredNotification> {
  const stored: StoredNotification = {
    ...alert,
    id:       `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storedAt: new Date().toISOString(),
  };
  try {
    const existing = await getAll();
    const updated  = [stored, ...existing].slice(0, MAX_STORED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[NotifStore] saveNotification failed:', e);
  }
  return stored;
}

export async function updateCachedGeometry(
  timestamp: string,
  pts:  [number, number][],
  meta: { time: number; dist: number } | null,
): Promise<void> {
  try {
    const all = await getAll();
    const idx = all.findIndex(n => n.timestamp === timestamp);
    if (idx === -1) return;
    all[idx].cachedRoutePts  = pts;
    all[idx].cachedRouteMeta = meta;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[NotifStore] updateCachedGeometry failed:', e);
  }
}

export async function clearAll(): Promise<void> {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
}

export const notificationStore = { getAll, saveNotification, updateCachedGeometry, clearAll };
export default notificationStore;