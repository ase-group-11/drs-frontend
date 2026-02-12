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
  // Admin Panel (Dummy endpoints - to be replaced with actual API)
  ADMIN: {
    DASHBOARD_STATS: '/admin/dashboard/stats',
    TREND_DATA: '/admin/dashboard/trends',
    DISTRIBUTION_DATA: '/admin/dashboard/distribution',
    ACTIVITY_LOGS: '/admin/dashboard/activity',
    SYSTEM_ALERTS: '/admin/dashboard/alerts',
    DISASTER_REPORTS: '/admin/disaster-reports',
  },
};
