// MODIFIED FILE — changes: Added TEAMS, LOCATIONS, and SETTINGS endpoint groups
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  // Emergency Team Auth
  EMERGENCY_TEAM: {
    REGISTER: '/emergency-team/register',
    REGISTER_VERIFY: '/emergency-team/register/verify',
    LOGIN: '/emergency-team/login',
    CHANGE_PASSWORD: '/emergency-team/change-password',
    DEACTIVATE: (id: string) => `/emergency-team/deactivate/${id}`,
    HEALTH: '/emergency-team/health',
  },
  // Regular User Auth
  AUTH: {
    REGISTER: '/auth/register',
    REGISTER_VERIFY: '/auth/register/verify',
    LOGIN: '/auth/login',
    LOGIN_VERIFY: '/auth/login/verify',
    HEALTH: '/auth/health',
  },
  // Admin Dashboard
  ADMIN: {
    DASHBOARD_STATS: '/admin/dashboard/stats',
    TREND_DATA: '/admin/dashboard/trends',
    DISTRIBUTION_DATA: '/admin/dashboard/distribution',
    ACTIVITY_LOGS: '/admin/dashboard/activity',
    SYSTEM_ALERTS: '/admin/dashboard/alerts',
    DISASTER_REPORTS: '/admin/disaster-reports',
  },
  // User Management
  USER_MANAGEMENT: {
    LIST: '/api/admin/users',
    CREATE: '/api/admin/users',
    UPDATE: (id: string) => `/api/admin/users/${id}`,
    DELETE: (id: string) => `/api/admin/users/${id}`,
    EXPORT: '/api/admin/users/export',
  },
  // Emergency Teams
  TEAMS: {
    LIST: '/api/admin/teams',
    CREATE: '/api/admin/teams',
    UPDATE: (id: string) => `/api/admin/teams/${id}`,
    DELETE: (id: string) => `/api/admin/teams/${id}`,
    DEPLOY: (id: string) => `/api/admin/teams/${id}/deploy`,
    DECOMMISSION: (id: string) => `/api/admin/teams/${id}/decommission`,
    ACTIVE_DISASTERS: '/api/admin/teams/active-disasters',
  },
  // Locations & Zones
  LOCATIONS: {
    LIST: '/api/admin/zones',
    CREATE: '/api/admin/zones',
    UPDATE: (id: string) => `/api/admin/zones/${id}`,
    DELETE: (id: string) => `/api/admin/zones/${id}`,
    EXPORT: '/api/admin/zones/export',
  },
  // Settings
  SETTINGS: {
    GENERAL: '/api/admin/settings/general',
    NOTIFICATIONS: '/api/admin/settings/notifications',
    SECURITY: '/api/admin/settings/security',
    SYSTEM_STATUS: '/api/admin/settings/system-status',
    CHANGE_PASSWORD: '/api/admin/settings/change-password',
  },
};
