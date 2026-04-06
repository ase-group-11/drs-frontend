// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/index.ts
// Services Index - COMPLETE & READY TO USE
// ═══════════════════════════════════════════════════════════════════════════

// Export service instances
export { authService } from './authService';
export { disasterService } from './disasterService';
export { mapService } from './mapService';

// Export validators and utilities from authService
export {
  formatPhoneForApi,
  validatePhoneNumber,
  validateEmail,
  validateFullName,
  validateOTP,
  getUserUnitInfo,
  clearCachedUnitInfo,
  ApiError,
} from './authService';

// Export default
export { default as authServiceDefault } from './authService';
export { default as disasterServiceDefault } from './disasterService';
export { default as mapServiceDefault } from './mapService';