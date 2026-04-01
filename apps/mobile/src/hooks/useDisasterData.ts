import { useState, useEffect, useCallback } from 'react';
import { disasterService } from '@services/disasterService';
import type { Disaster, Alert, Report } from '../types/disaster';

interface DisasterDataState {
  disasters: Disaster[];
  alerts: Alert[];
  reports: Report[];
  isLoading: boolean;
  error: string | null;
}

export const useDisasterData = () => {
  const [state, setState] = useState<DisasterDataState>({
    disasters: [],
    alerts: [],
    reports: [],
    isLoading: false,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [disasters, alerts, reports] = await Promise.all([
        disasterService.getActiveDisasters(),
        disasterService.getAlerts(),
        disasterService.getMyReports(),
      ]);
      setState({ disasters, alerts, reports, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (err as Error).message ?? 'Something went wrong',
      }));
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { ...state, refresh: fetchAll };
};

export default useDisasterData;