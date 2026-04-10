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

export interface HealthServiceStatus {
  status: string;
  // redis
  available?: boolean;
  fallback_active?: boolean;
  fallback_cache_size?: number;
  // tomtom
  circuit_breaker?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    postgresql: HealthServiceStatus;
    redis: HealthServiceStatus;
    rabbitmq: HealthServiceStatus;
    tomtom: HealthServiceStatus;
  };
}

// Alias so anything else importing SystemStatus still compiles
export type SystemStatus = HealthResponse;