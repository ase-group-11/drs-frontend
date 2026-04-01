// File: /web/src/services/api/admin.service.ts
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import { friendlyApiError } from '../../utils';
import type {
  DashboardStats,
  TrendDataPoint,
  DistributionDataPoint,
  ActivityLog,
  DisasterReport,
  DisasterRaw,
  DisastersApiResponse,
  SystemAlert,
  AdminApiResponse,
} from '../../types';

// Dashboard APIs
export const getDashboardStats = async (): Promise<AdminApiResponse<DashboardStats>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
    return { success: true, message: 'Dashboard stats fetched successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: friendlyApiError(error, 'Failed to load dashboard stats') };
  }
};

export const getTrendData = async (days: number = 7): Promise<AdminApiResponse<TrendDataPoint[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.TREND_DATA, { params: { days } });
    return { success: true, message: 'Trend data fetched successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: friendlyApiError(error, 'Failed to load trend data') };
  }
};

export const getDistributionData = async (): Promise<AdminApiResponse<DistributionDataPoint[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DISTRIBUTION_DATA);
    return { success: true, message: 'Distribution data fetched successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: friendlyApiError(error, 'Failed to load distribution data') };
  }
};

export const getActivityLogs = async (limit: number = 10): Promise<AdminApiResponse<ActivityLog[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACTIVITY_LOGS, { params: { limit } });
    return { success: true, message: 'Activity logs fetched successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: friendlyApiError(error, 'Failed to load activity logs') };
  }
};

export const getSystemAlerts = async (): Promise<AdminApiResponse<SystemAlert[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.SYSTEM_ALERTS);
    return { success: true, message: 'System alerts fetched successfully', data: response.data };
  } catch (error: any) {
    return { success: false, message: friendlyApiError(error, 'Failed to load system alerts') };
  }
};
// Disaster Reports APIs

// Maps raw API disaster to UI DisasterReport shape
const STATUS_TO_PROGRESS: Record<string, number> = {
  ACTIVE:     60,
  MONITORING: 30,
  RESOLVED:   100,
  ARCHIVED:   100,
  CRITICAL:   80,
};

const mapDisaster = (raw: DisasterRaw): DisasterReport => ({
  id:              raw.id,
  trackingId:      raw.tracking_id,
  type:            raw.type,
  title:           raw.type.charAt(0) + raw.type.slice(1).toLowerCase(),
  reportId:        raw.tracking_id,
  location:        raw.location_address ?? '',
  locationCoords:  raw.location,
  zone:            raw.location_address?.split(',').slice(-1)[0]?.trim() || '',
  time:            raw.time_ago,
  units:           raw.units_assigned,
  severity:        raw.severity.toLowerCase(),
  description:     raw.description,
  responseStatus:  STATUS_TO_PROGRESS[raw.disaster_status] ?? 0,
  createdAt:       raw.created_at,
  disasterStatus:  raw.disaster_status,
  peopleAffected:  raw.people_affected,
  reportCount:     raw.report_count,
  deployedUnits:   raw.deployed_units ?? [],
});

export const getDisasterReports = async (): Promise<AdminApiResponse<DisasterReport[]> & { summary?: DisastersApiResponse['summary'] }> => {
  try {
    const response = await apiClient.get<DisastersApiResponse>(API_ENDPOINTS.ADMIN.DISASTERS_ALL);
    return {
      success: true,
      message: 'Disaster reports fetched successfully',
      data: response.data.disasters.map(mapDisaster),
      summary: response.data.summary,
    };
  } catch (error: any) {
    return {
      success: false,
      message: friendlyApiError(error, 'Failed to fetch disaster reports'),
    };
  }
};

export const getEmergencyUnitById = async (id: string): Promise<import('../../types').EmergencyUnitDetail | null> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.TEAMS.UNIT_BY_ID(id));
    return response.data;
  } catch {
    return null;
  }
};

export const getDisasterReportById = async (id: string): Promise<AdminApiResponse<DisasterReport>> => {
  try {
    const response = await apiClient.get<DisasterRaw>(API_ENDPOINTS.ADMIN.DISASTER_BY_ID(id));
    return {
      success: true,
      message: 'Disaster report fetched successfully',
      data: mapDisaster(response.data),
    };
  } catch (error: any) {
    return {
      success: false,
      message: friendlyApiError(error, 'Failed to fetch disaster report'),
    };
  }
};

export const updateDisasterReportStatus = async (
  id: string,
  resolutionNotes: string
): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.DISASTER_RESOLVE(id), {
      resolution_notes: resolutionNotes,
    });
    return {
      success: true,
      message: 'Disaster resolved successfully',
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: friendlyApiError(error, 'Failed to resolve disaster'),
    };
  }
};

export const escalateDisasterSeverity = async (
  id: string,
  newSeverity: string,
  reason: string
): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.DISASTER_ESCALATE(id), {
      new_severity: newSeverity,
      reason,
    });
    return {
      success: true,
      message: 'Disaster severity escalated successfully',
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: friendlyApiError(error, 'Failed to escalate severity'),
    };
  }
};

export const dispatchUnits = async (
  id: string,
  unitIds: string[],
  priorityLevel: string = 'STANDARD',
  specialInstructions: string = ''
): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN.DISASTER_DISPATCH(id), {
      unit_ids: unitIds,
      priority_level: priorityLevel,
      special_instructions: specialInstructions || undefined,
    });
    return {
      success: true,
      message: 'Units dispatched successfully',
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: friendlyApiError(error, 'Failed to dispatch units'),
    };
  }
};