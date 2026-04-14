// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/mapActionStore.ts
// Simple module-level store for pending map actions.
// Avoids the navigation params race condition between useEffect and useFocusEffect.
// ═══════════════════════════════════════════════════════════════════════════

export type MapAction =
  | { type: 'flyTo';            lat: number; lon: number; label: string; disasterId?: string }
  | { type: 'evacuationRoute';  lat: number; lon: number; label: string };

let _pending: MapAction | null = null;
let _listeners: (() => void)[] = [];

export const mapActionStore = {
  setPending(action: MapAction) {
    _pending = action;
    _listeners.forEach(l => l());
  },

  consume(): MapAction | null {
    const action = _pending;
    _pending = null;
    return action;
  },

  hasPending(): boolean {
    return _pending !== null;
  },

  subscribe(listener: () => void): () => void {
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  },
};