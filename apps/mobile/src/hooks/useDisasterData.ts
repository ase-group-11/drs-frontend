// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useDisasterData.ts
// Hook that provides disaster data. Reads from global store (activeDisasters)
// and fetches reports for the current user.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { disasterService } from '@services/disasterService';
import { authService } from '@services/authService';
import { disasterStore } from '@services/disasterStore';

export const useDisasterData = () => {
  const [reports, setReports]   = useState<any[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Subscribe to store for reactive disasters / alerts
  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => {
    const unsub = disasterStore.subscribe(() => setStoreVersion(n => n + 1));
    return unsub;
  }, []);

  const state = disasterStore.getState();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.getStoredUser();
      if (user?.id) {
        const r = await disasterService.getMyReports(user.id);
        setReports(r);
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return {
    disasters: state.activeDisasters,
    alerts:    state.alerts,
    reports,
    isLoading,
    error,
    refresh: fetchReports,
  };
};

export default useDisasterData;