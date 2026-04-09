/**
 * UNIT TESTS — src/utils/validation.ts
 *
 * Tests every exported validation/formatting function
 * with valid inputs, edge cases, and invalid inputs.
 */

import {
  isValidIrishPhone,
  isValidPhone,
  isValidName,
  isValidOTP,
  isValidEmail,
  formatPhoneDisplay,
  maskPhone,
} from '@utils/validation';

// ─────────────────────────────────────────────────────────────────────────
// isValidIrishPhone
// ─────────────────────────────────────────────────────────────────────────
describe('isValidIrishPhone', () => {
  it('accepts a standard 10-digit Irish mobile (087 xxx xxxx)', () => {
    expect(isValidIrishPhone('0871234567')).toBe(true);
  });

  it('accepts a 9-digit number without leading 0', () => {
    expect(isValidIrishPhone('871234567')).toBe(true);
  });

  it('accepts numbers with spaces (strips non-digits)', () => {
    expect(isValidIrishPhone('087 123 4567')).toBe(true);
  });

  it('rejects numbers shorter than 7 digits', () => {
    expect(isValidIrishPhone('123456')).toBe(false);
  });

  it('rejects numbers longer than 10 digits', () => {
    expect(isValidIrishPhone('08712345678')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidIrishPhone('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isValidPhone (generic)
// ─────────────────────────────────────────────────────────────────────────
describe('isValidPhone', () => {
  it('accepts a 10-digit number', () => {
    expect(isValidPhone('1234567890')).toBe(true);
  });

  it('accepts a 15-digit international number', () => {
    expect(isValidPhone('123456789012345')).toBe(true);
  });

  it('accepts numbers with dashes (strips them)', () => {
    expect(isValidPhone('123-456-7890')).toBe(true);
  });

  it('rejects a 6-digit number', () => {
    expect(isValidPhone('123456')).toBe(false);
  });

  it('rejects a 16-digit number', () => {
    expect(isValidPhone('1234567890123456')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isValidName
// ─────────────────────────────────────────────────────────────────────────
describe('isValidName', () => {
  it('accepts a standard first name', () => {
    expect(isValidName('John')).toBe(true);
  });

  it('accepts a name with exactly 2 characters', () => {
    expect(isValidName('Jo')).toBe(true);
  });

  it('accepts a name with trailing/leading spaces (trimmed)', () => {
    expect(isValidName('  Al  ')).toBe(true);
  });

  it('accepts a 100-character name', () => {
    expect(isValidName('A'.repeat(100))).toBe(true);
  });

  it('rejects a single character', () => {
    expect(isValidName('J')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('rejects a name with 101 characters', () => {
    expect(isValidName('A'.repeat(101))).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidName('   ')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isValidOTP
// ─────────────────────────────────────────────────────────────────────────
describe('isValidOTP', () => {
  it('accepts a 6-digit numeric OTP (default length)', () => {
    expect(isValidOTP('123456')).toBe(true);
  });

  it('accepts a 4-digit OTP when length is specified as 4', () => {
    expect(isValidOTP('1234', 4)).toBe(true);
  });

  it('rejects OTP with letters', () => {
    expect(isValidOTP('12345a')).toBe(false);
  });

  it('rejects OTP shorter than specified length', () => {
    expect(isValidOTP('12345')).toBe(false);
  });

  it('rejects OTP longer than specified length', () => {
    expect(isValidOTP('1234567')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidOTP('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// isValidEmail
// ─────────────────────────────────────────────────────────────────────────
describe('isValidEmail', () => {
  it('accepts a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('accepts email with plus sign', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// formatPhoneDisplay
// ─────────────────────────────────────────────────────────────────────────
describe('formatPhoneDisplay', () => {
  it('returns up to 3 digits unformatted', () => {
    expect(formatPhoneDisplay('087')).toBe('087');
  });

  it('adds space after first 3 digits (4-6 digit input)', () => {
    expect(formatPhoneDisplay('08712')).toBe('087 12');
  });

  it('formats 10 digits as "XXX XXX XXXX"', () => {
    expect(formatPhoneDisplay('0871234567')).toBe('087 123 4567');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhoneDisplay('087-123-4567')).toBe('087 123 4567');
  });

  it('handles empty string', () => {
    expect(formatPhoneDisplay('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// maskPhone
// ─────────────────────────────────────────────────────────────────────────
describe('maskPhone', () => {
  it('masks all but the last 4 digits by default', () => {
    expect(maskPhone('0871234567')).toBe('******4567');
  });

  it('masks all but the specified number of visible digits', () => {
    expect(maskPhone('0871234567', 2)).toBe('********67');
  });

  it('returns the full string if it is shorter than visibleDigits', () => {
    expect(maskPhone('12', 4)).toBe('12');
  });

  it('returns the full string when length equals visibleDigits', () => {
    expect(maskPhone('1234', 4)).toBe('1234');
  });
});