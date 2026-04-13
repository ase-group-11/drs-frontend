import {
  formatPhoneForApi, validatePhoneNumber, validateEmail,
  validateFullName, validateOTP, ApiError,
} from '../authService';

describe('formatPhoneForApi', () => {
  it('combines country code and number correctly', () => {
    expect(formatPhoneForApi('+353', '851234567')).toBe('+353851234567');
  });
  it('adds a leading + if country code does not have one', () => {
    expect(formatPhoneForApi('353', '851234567')).toBe('+353851234567');
  });
  it('strips spaces and dashes from the phone number', () => {
    expect(formatPhoneForApi('+353', '85 123-4567')).toBe('+353851234567');
  });
  it('handles country code that already has a +', () => {
    expect(formatPhoneForApi('+1', '2025550123')).toBe('+12025550123');
  });
});

describe('validatePhoneNumber', () => {
  it('returns valid:true for a 7-digit number', () => {
    expect(validatePhoneNumber('1234567').valid).toBe(true);
  });
  it('returns valid:true for a 15-digit number', () => {
    expect(validatePhoneNumber('123456789012345').valid).toBe(true);
  });
  it('returns error for empty input', () => {
    const r = validatePhoneNumber('');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Please enter your mobile number');
  });
  it('returns error for fewer than 7 digits', () => {
    const r = validatePhoneNumber('12345');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/at least 7/i);
  });
  it('returns error for more than 15 digits', () => {
    const r = validatePhoneNumber('1234567890123456');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too long/i);
  });
});

describe('validateEmail', () => {
  it('returns valid:true for empty string (email is optional)', () => {
    expect(validateEmail('').valid).toBe(true);
  });
  it('returns valid:true for a valid email', () => {
    expect(validateEmail('test@test.com').valid).toBe(true);
  });
  it('returns error for an invalid email format', () => {
    const r = validateEmail('notanemail');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/valid email/i);
  });
});

describe('validateFullName', () => {
  it('returns valid:true for a two-character name', () => {
    expect(validateFullName('Jo').valid).toBe(true);
  });
  it('returns error for empty string', () => {
    const r = validateFullName('');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/enter your name/i);
  });
  it('returns error for a single character', () => {
    const r = validateFullName('J');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/at least 2/i);
  });
  it('returns error for a name over 100 characters', () => {
    const r = validateFullName('A'.repeat(101));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too long/i);
  });
  it('returns error for name containing numbers', () => {
    const r = validateFullName('John123');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/invalid characters/i);
  });
  it('returns valid:true for name with hyphen and apostrophe', () => {
    expect(validateFullName("O'Brien-Smith").valid).toBe(true);
  });
});

describe('validateOTP', () => {
  it('returns valid:true for a 6-digit OTP', () => {
    expect(validateOTP('123456').valid).toBe(true);
  });
  it('returns valid:false for OTP containing letters', () => {
    expect(validateOTP('12345a').valid).toBe(false);
  });
  it('returns valid:false for OTP shorter than required length', () => {
    expect(validateOTP('12345').valid).toBe(false);
  });
  it('supports a custom required length', () => {
    expect(validateOTP('1234', 4).valid).toBe(true);
  });
});

describe('ApiError', () => {
  it('is an instance of Error', () => {
    expect(new ApiError('failed', 400)).toBeInstanceOf(Error);
  });
  it('stores the message and status code', () => {
    const e = new ApiError('Not found', 404);
    expect(e.message).toBe('Not found');
    expect(e.status).toBe(404);
  });
  it('stores an optional data payload', () => {
    const e = new ApiError('Bad request', 400, { field: 'phone' });
    expect(e.data).toEqual({ field: 'phone' });
  });
});