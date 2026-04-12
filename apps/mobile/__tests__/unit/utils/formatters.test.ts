/**
 * UNIT TESTS — src/utils/formatters.ts
 *
 * Tests getTimeAgo, getDisasterIcon, getSeverityLabel.
 * getSeverityColor is omitted (depends on theme at runtime).
 */

import { getTimeAgo, getDisasterIcon, getSeverityLabel } from '@utils/formatters';

// ─────────────────────────────────────────────────────────────────────────
// getTimeAgo
// ─────────────────────────────────────────────────────────────────────────
describe('getTimeAgo', () => {
  const now = () => new Date();
  const secsAgo = (s: number) => new Date(Date.now() - s * 1000);

  it('returns "just now" for dates less than 60 seconds ago', () => {
    expect(getTimeAgo(secsAgo(30))).toBe('just now');
  });

  it('returns "just now" for the current moment', () => {
    expect(getTimeAgo(now())).toBe('just now');
  });

  it('returns singular "min" for exactly 60 seconds ago', () => {
    expect(getTimeAgo(secsAgo(60))).toBe('1 min ago');
  });

  it('returns plural "mins" for 2+ minutes ago', () => {
    expect(getTimeAgo(secsAgo(120))).toBe('2 mins ago');
  });

  it('returns "1 hour ago" for exactly 3600 seconds', () => {
    expect(getTimeAgo(secsAgo(3600))).toBe('1 hour ago');
  });

  it('returns plural "hours" for 2+ hours ago', () => {
    expect(getTimeAgo(secsAgo(7200))).toBe('2 hours ago');
  });

  it('returns "yesterday" for 24-47 hours ago', () => {
    expect(getTimeAgo(secsAgo(86400))).toBe('yesterday');
  });

  it('returns days count for 48+ hours ago', () => {
    expect(getTimeAgo(secsAgo(86400 * 3))).toBe('3 days ago');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getDisasterIcon
// ─────────────────────────────────────────────────────────────────────────
describe('getDisasterIcon', () => {
  it('returns fire emoji for "fire"', () => {
    expect(getDisasterIcon('fire')).toBe('🔥');
  });

  it('returns wave emoji for "flood"', () => {
    expect(getDisasterIcon('flood')).toBe('🌊');
  });

  it('returns wind emoji for "storm"', () => {
    expect(getDisasterIcon('storm')).toBe('💨');
  });

  it('returns car emoji for "accident"', () => {
    expect(getDisasterIcon('accident')).toBe('🚗');
  });

  it('returns lightning emoji for "power"', () => {
    expect(getDisasterIcon('power')).toBe('⚡');
  });

  it('returns pin emoji for unknown type', () => {
    expect(getDisasterIcon('earthquake')).toBe('📍');
  });

  it('returns pin emoji for empty string', () => {
    expect(getDisasterIcon('')).toBe('📍');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getSeverityLabel
// ─────────────────────────────────────────────────────────────────────────
describe('getSeverityLabel', () => {
  it('capitalises "critical"', () => {
    expect(getSeverityLabel('critical')).toBe('Critical');
  });

  it('capitalises "high"', () => {
    expect(getSeverityLabel('high')).toBe('High');
  });

  it('capitalises "medium"', () => {
    expect(getSeverityLabel('medium')).toBe('Medium');
  });

  it('capitalises "low"', () => {
    expect(getSeverityLabel('low')).toBe('Low');
  });

  it('handles already-capitalised input', () => {
    expect(getSeverityLabel('Critical')).toBe('Critical');
  });
});