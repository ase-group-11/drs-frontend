// File: /web/src/types/admin.types.ts
export type DisasterType = 'fire' | 'flood' | 'accident' | 'storm';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type ReportStatus = 'reported' | 'assessing' | 'active' | 'resolved';

// API disaster_status values from real API
export type DisasterStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ARCHIVED' | 'CRITICAL';

export interface DashboardStats {
  totalUsers: number;
  totalUsersChange: number;
  activeDisasters: number;
  criticalDisasters: number;
  emergencyTeams: number;
  activeTeams: number;
  systemStatus: 'operational' | 'degraded' | 'down';
  uptime: number;
}

export interface TrendDataPoint {
  day: string;
  total: number;
  critical: number;
}

export interface DistributionDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface ActivityLog {
  time: string;
  activity: string;
  user: string;
  status: string;
  statusColor: string;
}

// UI-facing shape used by DisasterReports component
export interface DisasterReport {
  id: string;
  trackingId: string;        // from tracking_id
  type: string;              // raw API type e.g. 'FIRE', 'FLOOD'
  title: string;             // derived: capitalised type
  reportId: string;          // from tracking_id
  location: string;          // from location_address
  locationCoords: { lat: number; lon: number }; // from location
  zone: string;              // derived from location_address
  time: string;              // from time_ago
  units: number;             // from units_assigned
  severity: string;          // lowercased from API severity
  description: string;
  responseStatus: number;    // derived from disaster_status
  createdAt: string;
  disasterStatus: DisasterStatus; // raw status from API
  peopleAffected: number;
  reportCount: number;
  deployedUnits: string[];  // from deployed_units
}

// Raw shape from GET /api/v1/disasters/all
export interface DisasterRaw {
  id: string;
  tracking_id: string;
  type: string;
  severity: string;
  disaster_status: DisasterStatus;
  description: string;
  location: { lat: number; lon: number };
  location_address: string;
  people_affected: number;
  units_assigned: number;
  report_count: number;
  deployed_units: string[];
  created_at: string;
  time_ago: string;
}

export interface DisastersApiResponse {
  disasters: DisasterRaw[];
  count: number;
  summary: {
    critical: number;
    active: number;
    resolved: number;
    monitoring: number;
    archived: number;
  };
}

export interface ResponseStep {
  id: string;
  label: string;
  completed: boolean;
  inProgress: boolean;
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
}

export interface AdminApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}