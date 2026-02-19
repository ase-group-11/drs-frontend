// NEW FILE
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type { Zone, CreateZonePayload, UpdateZonePayload, AdminApiResponse } from '../../types';

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_ZONES: Zone[] = [
  {
    id: '1',
    name: 'Zone A – City Center',
    type: 'response',
    status: 'active',
    area: 12.4,
    population: 45000,
    units: 8,
    incidents: 3,
    avgResponseTime: '4.2 mins',
  },
  {
    id: '2',
    name: 'Zone B – Coastal Area',
    type: 'evacuation',
    status: 'emergency',
    area: 18.7,
    population: 32000,
    units: 6,
    incidents: 5,
    avgResponseTime: '5.1 mins',
  },
  {
    id: '3',
    name: 'Zone C – Highway',
    type: 'response',
    status: 'active',
    area: 25.3,
    population: 15000,
    units: 4,
    incidents: 1,
    avgResponseTime: '6.3 mins',
  },
  {
    id: '4',
    name: 'Zone D – Parks',
    type: 'restricted',
    status: 'inactive',
    area: 8.9,
    population: 5000,
    units: 2,
    incidents: 0,
    avgResponseTime: '3.8 mins',
  },
];

export const getZones = async (): Promise<AdminApiResponse<Zone[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.LOCATIONS.LIST);
    return { success: true, message: 'Zones fetched', data: response.data };
  } catch (error: any) {
    console.warn('getZones API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: [...DUMMY_ZONES] };
  }
};

export const createZone = async (
  payload: CreateZonePayload
): Promise<AdminApiResponse<Zone>> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.LOCATIONS.CREATE, payload);
    return { success: true, message: 'Zone created', data: response.data };
  } catch (error: any) {
    console.warn('createZone API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const newZone: Zone = {
      id: String(Date.now()),
      name: payload.name,
      type: payload.type,
      status: 'active',
      area: payload.area || 0,
      population: 0,
      units: 0,
      incidents: 0,
      avgResponseTime: 'N/A',
    };
    DUMMY_ZONES.push(newZone);
    return { success: true, message: 'Zone created (fallback)', data: newZone };
  }
};

export const updateZone = async (
  id: string,
  payload: UpdateZonePayload
): Promise<AdminApiResponse<Zone>> => {
  try {
    const response = await apiClient.put(API_ENDPOINTS.LOCATIONS.UPDATE(id), payload);
    return { success: true, message: 'Zone updated', data: response.data };
  } catch (error: any) {
    console.warn('updateZone API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const idx = DUMMY_ZONES.findIndex((z) => z.id === id);
    if (idx !== -1) {
      DUMMY_ZONES[idx] = { ...DUMMY_ZONES[idx], ...payload };
      return { success: true, message: 'Zone updated (fallback)', data: DUMMY_ZONES[idx] };
    }
    return { success: false, message: 'Zone not found' };
  }
};

export const deleteZone = async (id: string): Promise<AdminApiResponse> => {
  try {
    await apiClient.delete(API_ENDPOINTS.LOCATIONS.DELETE(id));
    return { success: true, message: 'Zone deleted' };
  } catch (error: any) {
    console.warn('deleteZone API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const idx = DUMMY_ZONES.findIndex((z) => z.id === id);
    if (idx !== -1) DUMMY_ZONES.splice(idx, 1);
    return { success: true, message: 'Zone deleted (fallback)' };
  }
};
