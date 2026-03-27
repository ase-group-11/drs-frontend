// NEW FILE
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  EmergencyTeam,
  EmergencyUnitRaw,
  EmergencyUnitDetail,
  EmergencyUnitsApiResponse,
  CreateTeamPayload,
  DeployUnitPayload,
  ActiveDisaster,
  AdminApiResponse,
} from '../../types';

// ─── API response mapper ──────────────────────────────────────────────────────
// Maps the raw API unit shape to the EmergencyTeam shape used by the UI

const DEPT_TO_TYPE: Record<string, EmergencyTeam['type']> = {
  FIRE:    'Fire',
  MEDICAL: 'Ambulance',
  POLICE:  'Police',
  IT:      'Rescue',
};

const STATUS_TO_UI: Record<string, { status: EmergencyTeam['status']; statusType: EmergencyTeam['statusType'] }> = {
  AVAILABLE:   { status: 'Available',   statusType: 'available' },
  DEPLOYED:    { status: 'Deployed',    statusType: 'deployed' },
  ON_SCENE:    { status: 'On Scene',    statusType: 'onscene' },
  EN_ROUTE:    { status: 'En Route',    statusType: 'enroute' },
  RETURNING:   { status: 'Returning',   statusType: 'returning' },
  MAINTENANCE: { status: 'Maintenance', statusType: 'maintenance' },
  OFFLINE:     { status: 'Offline',     statusType: 'offline' },
};

const mapUnit = (raw: EmergencyUnitRaw): EmergencyTeam => {
  const uiStatus = STATUS_TO_UI[raw.unit_status] ?? { status: 'Available' as EmergencyTeam['status'], statusType: 'available' as EmergencyTeam['statusType'] };
  return {
    id:               raw.id,
    unitId:           raw.unit_code,
    unitName:         raw.unit_name,
    type:             DEPT_TO_TYPE[raw.department] ?? 'Rescue',
    department:       raw.department,
    station:          raw.station_name,
    status:           uiStatus.status,
    statusType:       uiStatus.statusType,
    crewSize:         `${raw.crew_count}/${raw.capacity}`,
    crewMax:          raw.capacity,
    crewCount:        raw.crew_count,
    location:         raw.station_address ?? raw.station_name,
    commanderName:    raw.commander_name,
    totalDeployments: raw.total_deployments,
  };
};

// ─── getTeams ─────────────────────────────────────────────────────────────────
// GET /api/v1/emergency-units/ — Bearer token sent automatically by axios interceptor

export const getTeams = async (): Promise<AdminApiResponse<EmergencyTeam[]> & { meta?: Omit<EmergencyUnitsApiResponse, 'units'> }> => {
  try {
    const response = await apiClient.get<EmergencyUnitsApiResponse>(API_ENDPOINTS.TEAMS.LIST);
    const { units, ...meta } = response.data;
    return {
      success: true,
      message: 'Teams fetched successfully',
      data: units.map(mapUnit),
      meta,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to fetch emergency units.',
    };
  }
};

export const getTeamById = async (id: string): Promise<AdminApiResponse<EmergencyUnitDetail>> => {
  try {
    const response = await apiClient.get<EmergencyUnitDetail>(API_ENDPOINTS.TEAMS.UNIT_BY_ID(id));
    return {
      success: true,
      message: 'Unit details fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to fetch unit details.',
    };
  }
};

export const createTeam = async (
  payload: CreateTeamPayload
): Promise<AdminApiResponse<EmergencyTeam>> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.TEAMS.CREATE, {
      unit_code:    payload.teamName,
      unit_name:    payload.teamName,
      unit_type:    payload.teamType.toUpperCase(),
      department:   payload.teamType.toUpperCase(),
      station_name: payload.location,
      capacity:     payload.numberOfMembers || 4,
    });
    return { success: true, message: 'Unit created successfully', data: mapUnit(response.data) };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to create unit.',
    };
  }
};

export const deployUnit = async (
  payload: DeployUnitPayload
): Promise<AdminApiResponse> => {
  try {
    await apiClient.post(API_ENDPOINTS.TEAMS.DEPLOY(payload.disasterId), {
      unit_ids:             [payload.unitId],
      priority_level:       payload.priority,
      special_instructions: payload.notes || undefined,
    });
    return { success: true, message: 'Unit dispatched successfully' };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to dispatch unit.',
    };
  }
};

export const decommissionUnit = async (
  id: string,
  reason: string
): Promise<AdminApiResponse> => {
  try {
    await apiClient.delete(API_ENDPOINTS.TEAMS.DECOMMISSION(id), {
      data: { reason },
    });
    return { success: true, message: 'Unit decommissioned successfully' };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to decommission unit.',
    };
  }
};

export const getActiveDisasters = async (): Promise<AdminApiResponse<ActiveDisaster[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DISASTERS_ALL);
    const data = response.data;
    // Filter for ACTIVE disasters from the all-disasters endpoint
    const allDisasters: ActiveDisaster[] = Array.isArray(data) ? data : (data?.disasters ?? []);
    const activeDisasters = allDisasters.filter(
      (d) => d.disaster_status === 'ACTIVE' || d.disaster_status === 'MONITORING'
    );
    return { success: true, message: 'Active disasters fetched', data: activeDisasters };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to fetch active disasters.',
    };
  }
};