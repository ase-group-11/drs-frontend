import type { Disaster, Alert, Report, SavedLocation } from '../types/disaster';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';
import { ApiError } from './authService';

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.message ?? 'Something went wrong', response.status, data);
    }
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new ApiError('Request timed out', 408);
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message ?? 'Network error', 0);
  }
}

export const disasterService = {
  getActiveDisasters: (): Promise<Disaster[]> =>
    apiRequest<Disaster[]>('/disasters/active'),

  getAlerts: (): Promise<Alert[]> =>
    apiRequest<Alert[]>('/alerts'),

  getMyReports: (): Promise<Report[]> =>
    apiRequest<Report[]>('/reports/my'),

  getSavedLocations: (): Promise<SavedLocation[]> =>
    apiRequest<SavedLocation[]>('/locations/saved'),

  submitReport: (data: Partial<Disaster>): Promise<Report> =>
    apiRequest<Report>('/reports', { method: 'POST', body: JSON.stringify(data) }),

  deleteReport: (id: string): Promise<void> =>
    apiRequest<void>(`/reports/${id}`, { method: 'DELETE' }),

  saveLocation: (location: Omit<SavedLocation, 'id' | 'alertCount'>): Promise<SavedLocation> =>
    apiRequest<SavedLocation>('/locations/saved', { method: 'POST', body: JSON.stringify(location) }),

  deleteLocation: (id: string): Promise<void> =>
    apiRequest<void>(`/locations/saved/${id}`, { method: 'DELETE' }),
};

export default disasterService;
