// NEW FILE

export interface GeneralSettings {
  systemName: string;
  adminEmail: string;
  timezone: string;
  language: string;
  dateFormat: string;
}

export interface NotificationSettings {
  criticalAlerts: boolean;
  dailySummary: boolean;
  teamUpdates: boolean;
  systemMaintenance: boolean;
  desktopNotifications: boolean;
  soundAlerts: boolean;
}

export interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SystemStatus {
  databaseStatus: 'Operational' | 'Degraded' | 'Down';
  apiStatus: 'Healthy' | 'Degraded' | 'Down';
  version: string;
  dbVersion: string;
  serverRegion: string;
  lastBackup: string;
  uptime: string;
}
