// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useDisasterStore.ts
// React hook that subscribes to the global disasterStore singleton
// and triggers re-renders when state changes.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { disasterStore } from '@services/disasterStore';

/**
 * Subscribe to the entire store. Re-renders when any field changes.
 */
export function useDisasterStore() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = disasterStore.subscribe(() => forceRender(n => n + 1));
    return unsub;
  }, []);

  return disasterStore.getState();
}

/**
 * Subscribe to a specific slice of the store via selector.
 * Only re-renders if the selected value changes (shallow compare).
 */
export function useStoreSelector<T>(selector: (state: ReturnType<typeof disasterStore.getState>) => T): T {
  const [value, setValue] = useState(() => selector(disasterStore.getState()));

  useEffect(() => {
    const unsub = disasterStore.subscribe(() => {
      const next = selector(disasterStore.getState());
      setValue(prev => {
        // Shallow equality check — avoids re-renders for unchanged values
        if (prev === next) return prev;
        if (Array.isArray(prev) && Array.isArray(next) && prev.length === next.length) {
          const same = prev.every((v, i) => v === next[i]);
          if (same) return prev;
        }
        return next;
      });
    });
    return unsub;
  }, [selector]);

  return value;
}

/**
 * Get unread alert count — reactive
 */
export function useUnreadAlertCount(): number {
  const alerts = useStoreSelector(s => s.alerts);
  return alerts.filter(a => !a.isRead).length;
}

export default useDisasterStore;