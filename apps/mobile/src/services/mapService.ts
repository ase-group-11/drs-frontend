// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/mapService.ts
// TRULY FINAL - Correctly reads backend format: location: { lat, lon }
// ═══════════════════════════════════════════════════════════════════════════

import type { Disaster } from '../types/disaster';
import { ApiError, authRequest } from './authService';

// ── apiRequest alias — uses authRequest which auto-refreshes on 401 ───────
const apiRequest = <T>(endpoint: string, options: RequestInit = {}) =>
  authRequest<T>(endpoint, options);

// ✅ Convert backend disaster to frontend format
const convertBackendDisaster = (backendData: any): Disaster | null => {
  try {
    // ✅ Backend format: { location: { lat: 53.3498, lon: -6.2603 } }
    let lat, lon;
    
    if (backendData.location) {
      // Try location.lat/lon first (backend format)
      lat = backendData.location.lat;
      lon = backendData.location.lon;
    }
    
    // Fallback to other possible field names
    if (!lat || !lon) {
      lat = backendData.lat || backendData.latitude;
      lon = backendData.lon || backendData.lng || backendData.longitude;
    }
    
    if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
      console.warn('Invalid coordinates for disaster:', backendData.id, { lat, lon });
      return null;
    }
    
    return {
      id: backendData.id || String(Math.random()),
      type: (backendData.type || backendData.disaster_type || 'other').toLowerCase(),
      severity: (backendData.severity || 'medium').toLowerCase(),
      title: `${backendData.type} - ${backendData.severity}`,
      location: {
        latitude: Number(lat),
        longitude: Number(lon),
        address: backendData.description || 'Disaster location',
      },
      description: backendData.description || '',
      reportedAt: backendData.created_at ? new Date(backendData.created_at) : new Date(),
      status: backendData.status?.toLowerCase() || 'active',
    };
  } catch (error) {
    console.error('Failed to convert disaster:', error);
    return null;
  }
};

export const mapService = {
  formatBounds: (minLat: number, minLng: number, maxLat: number, maxLng: number): string => {
    return `${minLat},${minLng},${maxLat},${maxLng}`;
  },
  
  getDisasters: async (bounds: string, limit: number = 50): Promise<Disaster[]> => {
    try {
      const response = await apiRequest<any>(
        `/live-map/disasters?bounds=${bounds}&limit=${limit}`
      );
      
      console.log('Raw backend response:', response);
      
      let disasterArray: any[] = [];
      
      if (Array.isArray(response)) {
        disasterArray = response;
      } else if (response.disasters && Array.isArray(response.disasters)) {
        disasterArray = response.disasters;
      } else {
        console.error('Unexpected response format:', response);
        return [];
      }
      
      const disasters = disasterArray
        .map(convertBackendDisaster)
        .filter((d): d is Disaster => d !== null);
      
      console.log('Converted disasters:', disasters.length);
      
      return disasters;
    } catch (error) {
      console.error('Failed to fetch disasters:', error);
      throw error;
    }
  },
  
  getLiveMapData: async (bounds: string, zoom: number) => {
    return apiRequest(`/live-map/data?bounds=${bounds}&zoom=${zoom}`);
  },
  
  getTraffic: async (bounds: string) => {
    return apiRequest(`/live-map/traffic?bounds=${bounds}`);
  },
  
  getPendingDisasters: async (limit: number = 50) => {
    return apiRequest(`/live-map/pending-disasters?limit=${limit}`);
  },
  getReroutePlan: async (disasterId: string) => {
    return apiRequest(`/reroute/status/${disasterId}`);
  },
};

export default mapService;