// NEW FILE
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  EmergencyTeam,
  CreateTeamPayload,
  DeployUnitPayload,
  ActiveDisaster,
  AdminApiResponse,
} from '../../types';

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_TEAMS: EmergencyTeam[] = [
  {
    id: '1',
    unitId: 'F-12',
    type: 'Fire',
    station: 'Dublin Central',
    status: 'Deployed',
    statusType: 'deployed',
    crewSize: '4/4',
    crewMax: 4,
    location: 'Grafton Street, Dublin 2',
    eta: '5 mins',
  },
  {
    id: '2',
    unitId: 'A-04',
    type: 'Ambulance',
    station: 'St James Hospital',
    status: 'Available',
    statusType: 'available',
    crewSize: '2/2',
    crewMax: 2,
    location: 'St James Hospital',
  },
  {
    id: '3',
    unitId: 'P-22',
    type: 'Police',
    station: 'Pearse Street',
    status: 'On Scene',
    statusType: 'onscene',
    crewSize: '2/2',
    crewMax: 2,
    location: 'Temple Bar, Dublin 2',
    eta: '0 mins',
  },
  {
    id: '4',
    unitId: 'R-01',
    type: 'Rescue',
    station: 'Dublin Airport',
    status: 'Maintenance',
    statusType: 'maintenance',
    crewSize: '0/4',
    crewMax: 4,
    location: 'Dublin Airport Base',
  },
  {
    id: '5',
    unitId: 'F-08',
    type: 'Fire',
    station: 'North Strand',
    status: 'En Route',
    statusType: 'enroute',
    crewSize: '4/4',
    crewMax: 4,
    location: 'Clontarf Road',
    eta: '8 mins',
  },
  {
    id: '6',
    unitId: 'A-11',
    type: 'Ambulance',
    station: 'Tallaght Hospital',
    status: 'Available',
    statusType: 'available',
    crewSize: '2/2',
    crewMax: 2,
    location: 'Tallaght',
  },
  {
    id: '7',
    unitId: 'P-15',
    type: 'Police',
    station: 'Store Street',
    status: 'Deployed',
    statusType: 'deployed',
    crewSize: '2/2',
    crewMax: 2,
    location: "O'Connell Street",
    eta: '3 mins',
  },
  {
    id: '8',
    unitId: 'F-21',
    type: 'Fire',
    station: 'Dolphins Barn',
    status: 'Available',
    statusType: 'available',
    crewSize: '4/4',
    crewMax: 4,
    location: 'Dolphins Barn Station',
  },
  {
    id: '9',
    unitId: 'R-03',
    type: 'Rescue',
    station: 'Dún Laoghaire',
    status: 'On Scene',
    statusType: 'onscene',
    crewSize: '3/4',
    crewMax: 4,
    location: 'Sandycove Beach',
    eta: '0 mins',
  },
];

// FALLBACK DUMMY DATA — remove or replace when API is live
const DUMMY_ACTIVE_DISASTERS: ActiveDisaster[] = [
  {
    id: '1',
    reportId: 'DR-2025-0023',
    type: 'fire',
    typeIcon: '🔥',
    location: 'Grafton Street, Dublin 2',
    severity: 'critical',
    distance: 2.4,
    eta: 6,
    currentUnits: 2,
    status: 'Active – In Progress',
    description: 'Large structure fire in commercial building. Multiple floors affected.',
    timeReported: '45 mins ago',
    reporter: 'Citizen alert',
  },
  {
    id: '2',
    reportId: 'DR-2025-0022',
    type: 'flood',
    typeIcon: '🌊',
    location: 'Clontarf Promenade',
    severity: 'high',
    distance: 5.8,
    eta: 12,
    currentUnits: 1,
    status: 'Active – In Progress',
    description: 'Coastal flooding due to high tide and storm surge.',
    timeReported: '1 hour ago',
    reporter: 'Weather station',
  },
  {
    id: '3',
    reportId: 'DR-2025-0021',
    type: 'accident',
    typeIcon: '⚠️',
    location: 'M50 Junction 9',
    severity: 'medium',
    distance: 8.2,
    eta: 15,
    currentUnits: 1,
    status: 'Active – Assessment',
    description: 'Multi-vehicle collision on motorway. Minor injuries reported.',
    timeReported: '2 hours ago',
    reporter: 'Police report',
  },
];

export const getTeams = async (): Promise<AdminApiResponse<EmergencyTeam[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.TEAMS.LIST);
    return { success: true, message: 'Teams fetched', data: response.data };
  } catch (error: any) {
    console.warn('getTeams API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: DUMMY_TEAMS };
  }
};

export const createTeam = async (
  payload: CreateTeamPayload
): Promise<AdminApiResponse<EmergencyTeam>> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.TEAMS.CREATE, payload);
    return { success: true, message: 'Team created', data: response.data };
  } catch (error: any) {
    console.warn('createTeam API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const newTeam: EmergencyTeam = {
      id: String(Date.now()),
      unitId: `NEW-${Date.now().toString().slice(-4)}`,
      type: 'Fire',
      station: payload.location,
      status: 'Available',
      statusType: 'available',
      crewSize: `0/${payload.numberOfMembers || 4}`,
      crewMax: payload.numberOfMembers || 4,
      location: payload.location,
    };
    DUMMY_TEAMS.push(newTeam);
    return { success: true, message: 'Team created (fallback)', data: newTeam };
  }
};

export const deployUnit = async (
  payload: DeployUnitPayload
): Promise<AdminApiResponse> => {
  try {
    await apiClient.post(API_ENDPOINTS.TEAMS.DEPLOY(payload.unitId), payload);
    return { success: true, message: 'Unit deployed successfully' };
  } catch (error: any) {
    console.warn('deployUnit API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const team = DUMMY_TEAMS.find((t) => t.unitId === payload.unitId);
    if (team) {
      team.status = 'Deployed';
      team.statusType = 'deployed';
    }
    return { success: true, message: 'Unit deployed (fallback)' };
  }
};

export const decommissionUnit = async (
  id: string,
  reason: string
): Promise<AdminApiResponse> => {
  try {
    await apiClient.post(API_ENDPOINTS.TEAMS.DECOMMISSION(id), { reason });
    return { success: true, message: 'Unit decommissioned' };
  } catch (error: any) {
    console.warn('decommissionUnit API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    const idx = DUMMY_TEAMS.findIndex((t) => t.id === id);
    if (idx !== -1) DUMMY_TEAMS.splice(idx, 1);
    return { success: true, message: 'Unit decommissioned (fallback)' };
  }
};

export const getActiveDisasters = async (): Promise<AdminApiResponse<ActiveDisaster[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.TEAMS.ACTIVE_DISASTERS);
    return { success: true, message: 'Disasters fetched', data: response.data };
  } catch (error: any) {
    console.warn('getActiveDisasters API failed, using fallback data:', error);
    // FALLBACK DUMMY DATA — remove or replace when API is live
    return { success: true, message: 'Using fallback data', data: DUMMY_ACTIVE_DISASTERS };
  }
};
