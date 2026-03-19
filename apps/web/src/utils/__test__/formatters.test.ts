import { formatPhoneNumber, maskPhoneNumber, formatDate } from '../formatters';

// ─── formatPhoneNumber ────────────────────────────────────────────────────────
describe('formatPhoneNumber', () => {
  it('formats a clean 10-digit string into XXX XXX XXXX', () => {
    expect(formatPhoneNumber('1234567890')).toBe('123 456 7890');
  });

  it('strips dashes before formatting', () => {
    expect(formatPhoneNumber('123-456-7890')).toBe('123 456 7890');
  });

  it('strips parentheses and spaces before formatting', () => {
    expect(formatPhoneNumber('(123) 456-7890')).toBe('123 456 7890');
  });

  it('returns original value when fewer than 10 digits after stripping', () => {
    expect(formatPhoneNumber('123456789')).toBe('123456789');
  });

  it('returns original value when more than 10 digits after stripping', () => {
    expect(formatPhoneNumber('12345678901')).toBe('12345678901');
  });

  it('returns empty string for empty input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });
});

// ─── maskPhoneNumber ──────────────────────────────────────────────────────────
describe('maskPhoneNumber', () => {
  it('masks the middle of a number with country code', () => {
    // "+353871234567" → "+353 ** *** 4567"
    expect(maskPhoneNumber('+353871234567')).toBe('+353 ** *** 4567');
  });

  it('works with a plain 10-digit number', () => {
    // "1234567890" → "1234 ** *** 7890"
    expect(maskPhoneNumber('1234567890')).toBe('1234 ** *** 7890');
  });

  it('preserves the first 4 characters exactly', () => {
    const result = maskPhoneNumber('+911234567890');
    expect(result.startsWith('+911')).toBe(true);
  });

  it('preserves the last 4 characters exactly', () => {
    const result = maskPhoneNumber('+911234567890');
    expect(result.endsWith('7890')).toBe(true);
  });

  it('returns empty string for empty input', () => {
    expect(maskPhoneNumber('')).toBe('');
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('includes the full month name in the output', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/January/);
  });

  it('includes the day number in the output', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/15/);
  });

  it('includes the year in the output', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/2024/);
  });

  it('accepts a Date object', () => {
    const d = new Date('2023-06-01');
    const result = formatDate(d);
    expect(result).toMatch(/2023/);
    expect(result).toMatch(/June/);
  });

  it('formats December correctly', () => {
    const result = formatDate('2024-12-25');
    expect(result).toMatch(/December/);
    expect(result).toMatch(/25/);
    expect(result).toMatch(/2024/);
  });

  it('returns a non-empty string', () => {
    const result = formatDate('2022-03-08');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});