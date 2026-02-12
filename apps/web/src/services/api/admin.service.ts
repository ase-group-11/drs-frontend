// File: /web/src/services/api/admin.service.ts
import apiClient from '../../lib/axios';
import { API_ENDPOINTS } from '../../config';
import type {
  DashboardStats,
  TrendDataPoint,
  DistributionDataPoint,
  ActivityLog,
  DisasterReport,
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

const DUMMY_DISASTER_REPORTS: DisasterReport[] = [
  {
    id: '1',
    type: 'fire',
    title: 'Fire',
    reportId: 'DR-2025-0023',
    location: '12 Grafton Street',
    zone: 'Zone A - Dublin City',
    time: '15 mins ago',
    units: 3,
    severity: 'critical',
    description: 'Large structure fire in commercial building. Multiple floors affected. Immediate evacuation in progress.',
    responseStatus: 65,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'flood',
    title: 'Flood',
    reportId: 'DR-2025-0022',
    location: 'Clontarf Promenade',
    zone: 'Zone B - Coastal',
    time: '45 mins ago',
    units: 2,
    severity: 'high',
    description: 'Coastal flooding due to high tide and storm surge. Several properties at risk.',
    responseStatus: 45,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'accident',
    title: 'Accident',
    reportId: 'DR-2025-0021',
    location: 'M50 Junction 9',
    zone: 'Zone C - Highway',
    time: '2 hours ago',
    units: 1,
    severity: 'medium',
    description: 'Multi-vehicle collision on motorway. Minor injuries reported. Lane closure in effect.',
    responseStatus: 80,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'storm',
    title: 'Storm Damage',
    reportId: 'DR-2025-0020',
    location: 'Phoenix Park',
    zone: 'Zone D - Parks',
    time: '3 hours ago',
    units: 2,
    severity: 'low',
    description: 'Fallen trees blocking pathways. No injuries. Cleanup in progress.',
    responseStatus: 90,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
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
export const getDisasterReports = async (
  filters?: {
    severity?: string;
    type?: string;
    status?: string;
  }
): Promise<AdminApiResponse<DisasterReport[]>> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DISASTER_REPORTS, {
      params: filters,
    });
    return {
      success: true,
      message: 'Disaster reports fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Disaster reports API failed, using fallback data:', error);
    return {
      success: true,
      message: 'Using fallback data',
      data: DUMMY_DISASTER_REPORTS,
    };
  }
};

export const getDisasterReportById = async (id: string): Promise<AdminApiResponse<DisasterReport>> => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.ADMIN.DISASTER_REPORTS}/${id}`);
    return {
      success: true,
      message: 'Disaster report fetched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.warn('Disaster report API failed, using fallback data:', error);
    const report = DUMMY_DISASTER_REPORTS.find((r) => r.id === id) || DUMMY_DISASTER_REPORTS[0];
    return {
      success: true,
      message: 'Using fallback data',
      data: report,
    };
  }
};

export const updateDisasterReportStatus = async (
  id: string,
  status: string
): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.DISASTER_REPORTS}/${id}/status`, {
      status,
    });
    return {
      success: true,
      message: 'Report status updated successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.error('Update report status error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to update report status',
    };
  }
};

export const escalateDisasterSeverity = async (
  id: string,
  severity: string
): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.patch(`${API_ENDPOINTS.ADMIN.DISASTER_REPORTS}/${id}/severity`, {
      severity,
    });
    return {
      success: true,
      message: 'Report severity escalated successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.error('Escalate severity error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to escalate severity',
    };
  }
};

export const dispatchUnits = async (id: string, units: number): Promise<AdminApiResponse> => {
  try {
    const response = await apiClient.post(`${API_ENDPOINTS.ADMIN.DISASTER_REPORTS}/${id}/dispatch`, {
      units,
    });
    return {
      success: true,
      message: 'Units dispatched successfully',
      data: response.data,
    };
  } catch (error: any) {
    console.error('Dispatch units error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to dispatch units',
    };
  }
};
