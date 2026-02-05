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
};
