import {
  validateEmail,
  validatePassword,
  validateIrishMobile,
  validateIndianMobile,
} from '../validation';

// ─── validateEmail ────────────────────────────────────────────────────────────
describe('validateEmail', () => {
  describe('valid emails', () => {
    it('accepts a standard email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });
    it('accepts subdomains', () => {
      expect(validateEmail('user@mail.company.com')).toBe(true);
    });
    it('accepts plus-addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });
    it('accepts numeric local parts', () => {
      expect(validateEmail('123@example.com')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('rejects missing @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });
    it('rejects missing TLD', () => {
      expect(validateEmail('user@example')).toBe(false);
    });
    it('rejects leading space', () => {
      expect(validateEmail(' user@example.com')).toBe(false);
    });
    it('rejects trailing space', () => {
      expect(validateEmail('user@example.com ')).toBe(false);
    });
    it('rejects space inside local part', () => {
      expect(validateEmail('us er@example.com')).toBe(false);
    });
    it('rejects empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
    it('rejects @ only', () => {
      expect(validateEmail('@')).toBe(false);
    });
    it('rejects double @', () => {
      expect(validateEmail('user@@example.com')).toBe(false);
    });
  });
});

// ─── validatePassword ─────────────────────────────────────────────────────────
describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('accepts a password meeting all requirements', () => {
      expect(validatePassword('Secure@1')).toBe(true);
    });
    it('accepts a longer complex password', () => {
      expect(validatePassword('MyP@ssw0rd123')).toBe(true);
    });
    it('accepts special char @', () => {
      expect(validatePassword('Aa1@Aa1@')).toBe(true);
    });
    it('accepts special char $', () => {
      expect(validatePassword('Aa1$Aa1$')).toBe(true);
    });
    it('accepts special char !', () => {
      expect(validatePassword('Aa1!Aa1!')).toBe(true);
    });
    it('accepts special char %', () => {
      expect(validatePassword('Aa1%Aa1%')).toBe(true);
    });
    it('accepts special char *', () => {
      expect(validatePassword('Aa1*Aa1*')).toBe(true);
    });
    it('accepts special char ?', () => {
      expect(validatePassword('Aa1?Aa1?')).toBe(true);
    });
    it('accepts special char &', () => {
      expect(validatePassword('Aa1&Aa1&')).toBe(true);
    });
  });

  describe('invalid passwords', () => {
    it('rejects password shorter than 8 characters', () => {
      expect(validatePassword('Sec@1')).toBe(false);
    });
    it('rejects password without uppercase letter', () => {
      expect(validatePassword('secure@1')).toBe(false);
    });
    it('rejects password without lowercase letter', () => {
      expect(validatePassword('SECURE@1')).toBe(false);
    });
    it('rejects password without digit', () => {
      expect(validatePassword('Secure@!')).toBe(false);
    });
    it('rejects password without special character', () => {
      expect(validatePassword('Secure12')).toBe(false);
    });
    it('rejects empty string', () => {
      expect(validatePassword('')).toBe(false);
    });
    it('rejects disallowed special char #', () => {
      expect(validatePassword('Secure#1')).toBe(false);
    });
  });
});

// ─── validateIrishMobile ──────────────────────────────────────────────────────
describe('validateIrishMobile', () => {
  describe('valid Irish mobile numbers', () => {
    it('accepts a number starting with 8 followed by 8 digits', () => {
      expect(validateIrishMobile('871234567')).toBe(true);
    });
    it('accepts 81xxxxxxx', () => {
      expect(validateIrishMobile('811234567')).toBe(true);
    });
    it('accepts 83xxxxxxx', () => {
      expect(validateIrishMobile('831234567')).toBe(true);
    });
    it('accepts 85xxxxxxx', () => {
      expect(validateIrishMobile('851234567')).toBe(true);
    });
    it('accepts 89xxxxxxx', () => {
      expect(validateIrishMobile('891234567')).toBe(true);
    });
  });

  describe('invalid Irish mobile numbers', () => {
    it('rejects number starting with 9', () => {
      expect(validateIrishMobile('912345678')).toBe(false);
    });
    it('rejects number starting with 7', () => {
      expect(validateIrishMobile('712345678')).toBe(false);
    });
    it('rejects number starting with 0', () => {
      expect(validateIrishMobile('012345678')).toBe(false);
    });
    it('rejects number with only 8 digits total', () => {
      expect(validateIrishMobile('87123456')).toBe(false);
    });
    it('rejects number with 10 digits total', () => {
      expect(validateIrishMobile('8712345678')).toBe(false);
    });
    it('rejects number with country code prefix', () => {
      expect(validateIrishMobile('+353871234567')).toBe(false);
    });
    it('rejects empty string', () => {
      expect(validateIrishMobile('')).toBe(false);
    });
    it('rejects letters', () => {
      expect(validateIrishMobile('8abcdefgh')).toBe(false);
    });
  });
});

// ─── validateIndianMobile ─────────────────────────────────────────────────────
describe('validateIndianMobile', () => {
  describe('valid Indian mobile numbers', () => {
    it('accepts a number starting with 6', () => {
      expect(validateIndianMobile('6123456789')).toBe(true);
    });
    it('accepts a number starting with 7', () => {
      expect(validateIndianMobile('7123456789')).toBe(true);
    });
    it('accepts a number starting with 8', () => {
      expect(validateIndianMobile('8123456789')).toBe(true);
    });
    it('accepts a number starting with 9', () => {
      expect(validateIndianMobile('9123456789')).toBe(true);
    });
  });

  describe('invalid Indian mobile numbers', () => {
    it('rejects number starting with 5', () => {
      expect(validateIndianMobile('5123456789')).toBe(false);
    });
    it('rejects number starting with 0', () => {
      expect(validateIndianMobile('0123456789')).toBe(false);
    });
    it('rejects number starting with 1', () => {
      expect(validateIndianMobile('1123456789')).toBe(false);
    });
    it('rejects number with 9 digits', () => {
      expect(validateIndianMobile('912345678')).toBe(false);
    });
    it('rejects number with 11 digits', () => {
      expect(validateIndianMobile('91234567890')).toBe(false);
    });
    it('rejects number with country code', () => {
      expect(validateIndianMobile('+919876543210')).toBe(false);
    });
    it('rejects empty string', () => {
      expect(validateIndianMobile('')).toBe(false);
    });
    it('rejects letters', () => {
      expect(validateIndianMobile('9abcdefghi')).toBe(false);
    });
  });
});