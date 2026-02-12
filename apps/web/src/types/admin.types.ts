// File: /web/src/types/admin.types.ts
export type DisasterType = 'fire' | 'flood' | 'accident' | 'storm';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type ReportStatus = 'reported' | 'assessing' | 'active' | 'resolved';

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

export interface DisasterReport {
  id: string;
  type: DisasterType;
  title: string;
  reportId: string;
  location: string;
  zone: string;
  time: string;
  units: number;
  severity: SeverityLevel;
  description: string;
  responseStatus: number;
  createdAt: string;
  updatedAt: string;
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
