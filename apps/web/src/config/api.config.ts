export const API_CONFIG = {
  BASE_URL:   process.env.REACT_APP_API_URL,
  HEALTH_URL: process.env.REACT_APP_HEALTH_URL, // root base — no /api/v1
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  // ── Emergency Team Auth ──────────────────────────────────────────────────────
  EMERGENCY_TEAM: {
    REGISTER:          '/emergency-team/register',
    REGISTER_VERIFY:   '/emergency-team/register/verify',
    LOGIN:             '/emergency-team/login',
    LOGIN_VERIFY:      '/emergency-team/login/verify',
    CHANGE_PASSWORD:   '/emergency-team/change-password',
    FORGOT_PASSWORD:   '/emergency-team/forgot-password',
    RESET_PASSWORD:    '/emergency-team/reset-password',
    DEACTIVATE:        (id: string) => `/emergency-team/deactivate/${id}`,
    HEALTH:            '/emergency-team/health',
  },

  // ── Regular User Auth ────────────────────────────────────────────────────────
  AUTH: {
    REGISTER:          '/auth/register',
    REGISTER_VERIFY:   '/auth/register/verify',
    LOGIN:             '/auth/login',
    LOGIN_VERIFY:      '/auth/login/verify',
    HEALTH:            '/auth/health',
  },

  // ── Disasters (canonical) ────────────────────────────────────────────────────
  DISASTERS: {
    ALL:               '/disasters/all',
    ACTIVE:            '/disasters/active',
    BY_ID:             (id: string) => `/disasters/${id}`,
    PHOTOS:            (id: string) => `/disasters/${id}/photos`,
    RESOLVE:           (id: string) => `/disasters/${id}/resolve`,
    ESCALATE:          (id: string) => `/disasters/${id}/escalate`,
    DISPATCH:          (id: string) => `/disasters/${id}/dispatch`,
    DISASTER_TIMELINE: (id: string) => `/disasters/${id}/timeline`,
  },

  // ── Reroute ──────────────────────────────────────────────────────────────────
  REROUTE: {
    PLANS:    '/reroute/plans',
    OVERRIDE: '/reroute/override',
  },

  // ── Emergency Units (canonical) ──────────────────────────────────────────────
  EMERGENCY_UNITS: {
    LIST:         '/emergency-units/',
    CREATE:       '/emergency-units/',
    BY_ID:        (id: string) => `/emergency-units/${id}`,
    UPDATE:       (id: string) => `/emergency-units/${id}`,
    DELETE:       (id: string) => `/emergency-units/${id}`,
    DECOMMISSION: (id: string) => `/emergency-units/${id}`,
    UPDATE_CREW:  (id: string) => `/emergency-units/${id}/crew`,
  },

  // ── Users (canonical) ────────────────────────────────────────────────────────
  USERS: {
    LIST:          '/users/',
    CREATE:        '/users/',
    BY_ID:         (id: string) => `/users/${id}`,
    UPDATE:        (id: string) => `/users/${id}/`,
    UPDATE_STATUS: (id: string) => `/users/${id}/status`,
    DELETE:        (id: string) => `/users/${id}`,
    DEPARTMENT_MAP:'/users/department-map',
  },

  // ── Admin Dashboard ──────────────────────────────────────────────────────────
  ADMIN: {
    DASHBOARD_STATS:   '/admin/dashboard/stats',
    TREND_DATA:        '/admin/dashboard/trends',
    DISTRIBUTION_DATA: '/admin/dashboard/distribution',
    ACTIVITY_LOGS:     '/admin/dashboard/activity',
    SYSTEM_ALERTS:     '/admin/dashboard/alerts',
    DISASTER_REPORTS:  '/admin/disaster-reports',
    // Disaster aliases (keep existing code working)
    DISASTERS_ACTIVE:  '/disasters/active',
    DISASTERS_ALL:     '/disasters/all',
    DISASTER_BY_ID:    (id: string) => `/disasters/${id}`,
    DISASTER_RESOLVE:  (id: string) => `/disasters/${id}/resolve`,
    DISASTER_ESCALATE: (id: string) => `/disasters/${id}/escalate`,
    DISASTER_DISPATCH: (id: string) => `/disasters/${id}/dispatch`,
    DISASTER_PHOTOS:   (id: string) => `/disasters/${id}/photos`,
    DISASTER_TIMELINE: (id: string) => `/disasters/${id}/timeline`,
  },

  // ── User Management (legacy alias) ───────────────────────────────────────────
  USER_MANAGEMENT: {
    LIST:          '/users/',
    CREATE:        '/users/',
    GET:           (id: string) => `/users/${id}`,
    DELETE:        (id: string) => `/users/${id}`,
    UPDATE_STATUS: (id: string) => `/users/${id}/status`,
    UPDATE:        (id: string) => `/users/${id}/`,
    DEPARTMENT_MAP:'/users/department-map',
  },

  // ── Emergency Teams (legacy alias) ───────────────────────────────────────────
  TEAMS: {
    LIST:             '/emergency-units/',
    CREATE:           '/emergency-units/',
    UPDATE:           (id: string) => `/emergency-units/${id}`,
    DELETE:           (id: string) => `/emergency-units/${id}`,
    UNIT_BY_ID:       (id: string) => `/emergency-units/${id}`,
    BY_ID:            (id: string) => `/emergency-units/${id}`,
    UPDATE_CREW:      (id: string) => `/emergency-units/${id}/crew`,
    DEPLOY:           (disasterId: string) => `/disasters/${disasterId}/dispatch`,
    DECOMMISSION:     (id: string) => `/emergency-units/${id}`,
    ACTIVE_DISASTERS: '/disasters/active',
  },

  // ── Evacuations ──────────────────────────────────────────────────────────────
  EVACUATIONS: {
    LIST:     '/evacuations',
    BY_ID:    (id: string) => `/evacuations/${id}`,
    APPROVE:  (id: string) => `/evacuations/${id}/approve`,
    ACTIVATE: (id: string) => `/evacuations/${id}/activate`,
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  SETTINGS: {
    GENERAL:         '/admin/settings/general',
    NOTIFICATIONS:   '/admin/settings/notifications',
    SECURITY:        '/admin/settings/security',
    CHANGE_PASSWORD: '/emergency-team/change-password',
    HEALTH:          '/health/ready', // uses healthClient (REACT_APP_HEALTH_URL), not apiClient
  },
};