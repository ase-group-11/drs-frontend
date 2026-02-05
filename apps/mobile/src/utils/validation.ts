/**
 * Validation Utilities
 */

/**
 * Validate Irish phone number format
 */
export const isValidIrishPhone = (phone: string): boolean => {
  // Irish mobile numbers: 08x xxx xxxx (10 digits starting with 08)
  // Or international format without country code: 8x xxx xxxx (9 digits)
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 10;
};

/**
 * Validate phone number (generic)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
};

/**
 * Validate name
 */
export const isValidName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
};

/**
 * Validate OTP format
 */
export const isValidOTP = (otp: string, length: number = 6): boolean => {
  return /^\d+$/.test(otp) && otp.length === length;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format phone number for display
 */
export const formatPhoneDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
};

/**
 * Mask phone number for display
 */
export const maskPhone = (phone: string, visibleDigits: number = 4): string => {
  if (phone.length <= visibleDigits) return phone;
  const maskedPart = '*'.repeat(phone.length - visibleDigits);
  const visiblePart = phone.slice(-visibleDigits);
  return maskedPart + visiblePart;
};
