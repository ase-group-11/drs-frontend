import {
  isValidIrishPhone, isValidPhone, isValidName,
  isValidOTP, isValidEmail, formatPhoneDisplay, maskPhone,
} from '../validation';

describe('isValidIrishPhone', () => {
  it('returns true for a valid 7-digit phone', () => {
    expect(isValidIrishPhone('0851234')).toBe(true);
  });
  it('returns true for a 10-digit Irish mobile', () => {
    expect(isValidIrishPhone('0851234567')).toBe(true);
  });
  it('returns false for fewer than 7 digits', () => {
    expect(isValidIrishPhone('12345')).toBe(false);
  });
  it('returns false for more than 10 digits', () => {
    expect(isValidIrishPhone('08512345678')).toBe(false);
  });
  it('strips non-digits before validating', () => {
    expect(isValidIrishPhone('085-123-4567')).toBe(true);
  });
});

describe('isValidPhone', () => {
  it('returns true for a 7-digit number', () => {
    expect(isValidPhone('1234567')).toBe(true);
  });
  it('returns true for a 15-digit number', () => {
    expect(isValidPhone('123456789012345')).toBe(true);
  });
  it('returns false for 6 digits', () => {
    expect(isValidPhone('123456')).toBe(false);
  });
  it('returns false for 16 digits', () => {
    expect(isValidPhone('1234567890123456')).toBe(false);
  });
});

describe('isValidName', () => {
  it('returns true for a valid 2-char name', () => {
    expect(isValidName('Jo')).toBe(true);
  });
  it('returns true for a 100-char name', () => {
    expect(isValidName('A'.repeat(100))).toBe(true);
  });
  it('returns false for empty string', () => {
    expect(isValidName('')).toBe(false);
  });
  it('returns false for a 1-char name', () => {
    expect(isValidName('J')).toBe(false);
  });
  it('returns false for a name over 100 chars', () => {
    expect(isValidName('A'.repeat(101))).toBe(false);
  });
});

describe('isValidOTP', () => {
  it('returns true for a 6-digit OTP', () => {
    expect(isValidOTP('123456')).toBe(true);
  });
  it('returns false for a 5-digit OTP', () => {
    expect(isValidOTP('12345')).toBe(false);
  });
  it('returns false for OTP containing letters', () => {
    expect(isValidOTP('12345a')).toBe(false);
  });
  it('supports a custom length of 4', () => {
    expect(isValidOTP('1234', 4)).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('returns true for a valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
  it('returns false for email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('formatPhoneDisplay', () => {
  it('returns as-is for 3 or fewer digits', () => {
    expect(formatPhoneDisplay('123')).toBe('123');
  });
  it('formats 6-digit number with one space', () => {
    expect(formatPhoneDisplay('123456')).toBe('123 456');
  });
  it('formats 9-digit number with two spaces', () => {
    expect(formatPhoneDisplay('123456789')).toBe('123 456 789');
  });
});

describe('maskPhone', () => {
  it('masks all but last 4 digits by default', () => {
    expect(maskPhone('+353851234567')).toBe('*********4567');
  });
  it('respects a custom visibleDigits parameter', () => {
    expect(maskPhone('123456789', 3)).toBe('******789');
  });
});