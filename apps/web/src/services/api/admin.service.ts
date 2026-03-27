// File: /web/src/services/api/admin.service.ts
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
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

// Fallback dummy data
const DUMMY_DASHBOARD_STATS: DashboardStats = {
  totalUsers: 12458,
  totalUsersChange: 234,
  activeDisasters: 23,
  criticalDisasters: 5,
  emergencyTeams: 156,
  activeTeams: 142,
  systemStatus: 'operational',
  uptime: 99.8,
};

const DUMMY_TREND_DATA: TrendDataPoint[] = [
  { day: 'Mon', total: 45, critical: 8 },
  { day: 'Tue', total: 52, critical: 12 },
  { day: 'Wed', total: 38, critical: 6 },
  { day: 'Thu', total: 61, critical: 15 },
  { day: 'Fri', total: 48, critical: 9 },
  { day: 'Sat', total: 35, critical: 5 },
  { day: 'Sun', total: 42, critical: 7 },
];

const DUMMY_DISTRIBUTION_DATA: DistributionDataPoint[] = [
  { name: 'Fire', value: 156, color: '#EF4444' },
  { name: 'Flood', value: 132, color: '#3B82F6' },
  { name: 'Accident', value: 98, color: '#F97316' },
  { name: 'Storm', value: 87, color: '#6B7280' },
  { name: 'Other', value: 75, color: '#EAB308' },
];

const DUMMY_ACTIVITY_LOGS: ActivityLog[] = [
  {
    time: '15:45',
    activity: 'New disaster report filed',
    user: 'John Murphy',
    status: 'Critical',
    statusColor: 'error',
  },
  {
    time: '15:30',
    activity: 'Team F-12 dispatched',
    user: 'System',
    status: 'Active',
    statusColor: 'success',
  },
  {
    time: '15:15',
    activity: 'Incident resolved',
    user: 'Sarah Connor',
    status: 'Resolved',
    statusColor: 'processing',
  },
  {
    time: '14:50',
    activity: 'User registration approved',
    user: 'Kyle Reese',
    status: 'Active',
    statusColor: 'success',
  },
  {
    time: '14:30',
    activity: 'Zone boundary updated',
    user: 'Admin User',
    status: 'Pending',
    statusColor: 'warning',
  },
];

const DUMMY_SYSTEM_ALERTS: SystemAlert[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Database backup overdue',
    description: 'Last backup was 36 hours ago',
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    severity: 'warning',
    title: 'API rate limit at 80%',
    description: 'Consider upgrading your plan',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// Dashboard APIs
export const getDashboardStats = async (): Promise<AdminApiResponse<DashboardStats>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
    return {
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Dashboard stats API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_DASHBOARD_STATS,
    };
  }
};

export const getTrendData = async (days: number = 7): Promise<AdminApiResponse<TrendDataPoint[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.TREND_DATA, {
      params: { days },
    });
    return {
      success: true,
      message: 'Trend data fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Trend data API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_TREND_DATA,
    };
  }
};

export const getDistributionData = async (): Promise<AdminApiResponse<DistributionDataPoint[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DISTRIBUTION_DATA);
    return {
      success: true,
      message: 'Distribution data fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Distribution data API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_DISTRIBUTION_DATA,
    };
  }
};

export const getActivityLogs = async (limit: number = 10): Promise<AdminApiResponse<ActivityLog[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.ACTIVITY_LOGS, {
      params: { limit },
    });
    return {
      success: true,
      message: 'Activity logs fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Activity logs API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_ACTIVITY_LOGS,
    };
  }
};

export const getSystemAlerts = async (): Promise<AdminApiResponse<SystemAlert[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.SYSTEM_ALERTS);
    return {
      success: true,
      message: 'System alerts fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('System alerts API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_SYSTEM_ALERTS,
    };
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
    console.error('getDisasterReports error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to fetch disaster reports.',
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
    console.error('getDisasterReportById error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to fetch disaster report.',
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
    console.error('updateDisasterReportStatus error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to resolve disaster',
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
    console.error('escalateDisasterSeverity error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to escalate severity',
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
    console.error('dispatchUnits error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to dispatch units',
    };
  }
};