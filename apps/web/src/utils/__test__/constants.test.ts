import {
  SALUTATIONS,
  ROLES,
  DEPARTMENTS,
  COUNTRY_CODES,
  OTP_EXPIRY_TIME,
  OTP_RESEND_TIME,
} from '../constants';

// ─── SALUTATIONS ──────────────────────────────────────────────────────────────
describe('SALUTATIONS', () => {
  it('contains exactly 5 entries', () => {
    expect(SALUTATIONS).toHaveLength(5);
  });

  it('includes Mr.', () => {
    expect(SALUTATIONS).toContainEqual({ value: 'mr', label: 'Mr.' });
  });

  it('includes Ms.', () => {
    expect(SALUTATIONS).toContainEqual({ value: 'ms', label: 'Ms.' });
  });

  it('includes Mrs.', () => {
    expect(SALUTATIONS).toContainEqual({ value: 'mrs', label: 'Mrs.' });
  });

  it('includes Dr.', () => {
    expect(SALUTATIONS).toContainEqual({ value: 'dr', label: 'Dr.' });
  });

  it('includes Prof.', () => {
    expect(SALUTATIONS).toContainEqual({ value: 'prof', label: 'Prof.' });
  });

  it('every entry has a non-empty value and label', () => {
    SALUTATIONS.forEach((s) => {
      expect(s).toHaveProperty('value');
      expect(s).toHaveProperty('label');
      expect(s.value.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
    });
  });
});

// ─── ROLES ────────────────────────────────────────────────────────────────────
describe('ROLES', () => {
  it('contains exactly 3 entries', () => {
    expect(ROLES).toHaveLength(3);
  });

  it('includes admin role', () => {
    expect(ROLES).toContainEqual({ value: 'admin', label: 'Admin' });
  });

  it('includes manager role', () => {
    expect(ROLES).toContainEqual({ value: 'manager', label: 'Manager' });
  });

  it('includes staff role', () => {
    expect(ROLES).toContainEqual({ value: 'staff', label: 'Staff' });
  });

  it('every entry has a non-empty value and label', () => {
    ROLES.forEach((r) => {
      expect(r).toHaveProperty('value');
      expect(r).toHaveProperty('label');
      expect(r.value.length).toBeGreaterThan(0);
      expect(r.label.length).toBeGreaterThan(0);
    });
  });
});

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
describe('DEPARTMENTS', () => {
  it('contains exactly 4 entries', () => {
    expect(DEPARTMENTS).toHaveLength(4);
  });

  it('includes Medical', () => {
    expect(DEPARTMENTS).toContainEqual({ value: 'medical', label: 'Medical' });
  });

  it('includes Police', () => {
    expect(DEPARTMENTS).toContainEqual({ value: 'police', label: 'Police' });
  });

  it('includes IT', () => {
    expect(DEPARTMENTS).toContainEqual({ value: 'it', label: 'IT' });
  });

  it('includes Fire', () => {
    expect(DEPARTMENTS).toContainEqual({ value: 'fire', label: 'Fire' });
  });

  it('every entry has a non-empty value and label', () => {
    DEPARTMENTS.forEach((d) => {
      expect(d).toHaveProperty('value');
      expect(d).toHaveProperty('label');
      expect(d.value.length).toBeGreaterThan(0);
      expect(d.label.length).toBeGreaterThan(0);
    });
  });
});

// ─── COUNTRY_CODES ────────────────────────────────────────────────────────────
describe('COUNTRY_CODES', () => {
  it('contains exactly 2 entries', () => {
    expect(COUNTRY_CODES).toHaveLength(2);
  });

  it('includes Ireland +353', () => {
    expect(COUNTRY_CODES).toContainEqual({ value: '+353', label: '+353 (Ireland)' });
  });

  it('includes India +91', () => {
    expect(COUNTRY_CODES).toContainEqual({ value: '+91', label: '+91 (India)' });
  });

  it('all country code values start with +', () => {
    COUNTRY_CODES.forEach((cc) => {
      expect(cc.value.startsWith('+')).toBe(true);
    });
  });
});

// ─── OTP Timing Constants ─────────────────────────────────────────────────────
describe('OTP timing constants', () => {
  it('OTP_EXPIRY_TIME equals 300 seconds (5 minutes)', () => {
    expect(OTP_EXPIRY_TIME).toBe(300);
  });

  it('OTP_RESEND_TIME equals 60 seconds (1 minute)', () => {
    expect(OTP_RESEND_TIME).toBe(60);
  });

  it('OTP_EXPIRY_TIME is greater than OTP_RESEND_TIME', () => {
    expect(OTP_EXPIRY_TIME).toBeGreaterThan(OTP_RESEND_TIME);
  });
});