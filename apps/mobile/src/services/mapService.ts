// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/mapService.ts
// TRULY FINAL - Correctly reads backend format: location: { lat, lon }
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '@constants/index';
import type { Disaster } from '../types/disaster';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
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
      type: (backendData.type || 'unknown').toLowerCase(),
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
};

export default mapService;