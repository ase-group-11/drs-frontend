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
    // Real API disaster endpoints
    DISASTERS_ACTIVE: '/disasters/active',
    DISASTERS_ALL: '/disasters/all',
    DISASTER_BY_ID: (id: string) => `/disasters/${id}`,
    DISASTER_RESOLVE: (id: string) => `/disasters/${id}/resolve`,
    DISASTER_ESCALATE: (id: string) => `/disasters/${id}/escalate`,
    DISASTER_DISPATCH: (id: string) => `/disasters/${id}/dispatch`,
    DISASTER_PHOTOS: (id: string) => `/disasters/${id}/photos`,
  },
  // User Management
  USER_MANAGEMENT: {
    LIST: '/users/',
    CREATE: '/users/',
    GET: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    UPDATE_STATUS: (id: string) => `/users/${id}/status`,
    DEPARTMENT_MAP: '/users/department-map',
  },
  // Emergency Teams
  TEAMS: {
    LIST: '/emergency-units/',
    CREATE: '/emergency-units/',
    UPDATE: (id: string) => `/emergency-units/${id}`,
    DELETE: (id: string) => `/emergency-units/${id}`,
    UNIT_BY_ID: (id: string) => `/emergency-units/${id}`,
    DEPLOY: (disasterId: string) => `/disasters/${disasterId}/dispatch`,
    DECOMMISSION: (id: string) => `/emergency-units/${id}`,
    ACTIVE_DISASTERS: '/disasters/active',
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