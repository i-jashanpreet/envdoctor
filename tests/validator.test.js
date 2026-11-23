'use strict';

const {
  validateValue,
  isValidUrl,
  isValidEmail,
  isBooleanLike,
  parseBoolean,
  isValidNumber
} = require('../src/validator');

describe('validator', () => {
  describe('isValidUrl', () => {
    test('returns true for valid web and database URLs', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com/api/v1')).toBe(true);
      expect(isValidUrl('postgres://user:pass@localhost:5432/mydb')).toBe(true);
      expect(isValidUrl('mongodb://127.0.0.1:27017/test')).toBe(true);
      expect(isValidUrl('redis://cache.internal:6379')).toBe(true);
    });

    test('returns false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('://missing-protocol')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(12345)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('returns true for valid email addresses', () => {
      expect(isValidEmail('admin@example.com')).toBe(true);
      expect(isValidEmail('developer.support+tag@sub.domain.co')).toBe(true);
    });

    test('returns false for invalid email addresses', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isBooleanLike & parseBoolean', () => {
    test('recognizes valid boolean representations', () => {
      expect(isBooleanLike('true')).toBe(true);
      expect(isBooleanLike('FALSE')).toBe(true);
      expect(isBooleanLike('1')).toBe(true);
      expect(isBooleanLike('0')).toBe(true);
      expect(isBooleanLike('yes')).toBe(true);
      expect(isBooleanLike('no')).toBe(true);
      expect(isBooleanLike(true)).toBe(true);
      expect(isBooleanLike(false)).toBe(true);
    });

    test('returns false for non-boolean strings', () => {
      expect(isBooleanLike('maybe')).toBe(false);
      expect(isBooleanLike('2')).toBe(false);
      expect(isBooleanLike('')).toBe(false);
      expect(isBooleanLike(null)).toBe(false);
    });

    test('correctly parses booleans', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    test('validates numbers correctly', () => {
      expect(isValidNumber('3000')).toBe(true);
      expect(isValidNumber('-50')).toBe(true);
      expect(isValidNumber('3.14159')).toBe(true);
      expect(isValidNumber(8080)).toBe(true);

      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber('')).toBe(false);
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
    });
  });

  describe('validateValue rules', () => {
    test('validates required variables', () => {
      const resMissing = validateValue('SECRET', undefined, { required: true });
      expect(resMissing.valid).toBe(false);
      expect(resMissing.type).toBe('missing');

      const resEmpty = validateValue('SECRET', '', { required: true });
      expect(resEmpty.valid).toBe(false);
      expect(resEmpty.type).toBe('empty');

      const resValid = validateValue('SECRET', 'my_secret_token', { required: true });
      expect(resValid.valid).toBe(true);
    });

    test('validates optional variables with defaults', () => {
      const res = validateValue('PORT', undefined, { required: false, default: 3000 });
      expect(res.valid).toBe(true);
      expect(res.parsedValue).toBe(3000);
    });

    test('validates number types with min and max constraints', () => {
      const rule = { required: true, type: 'number', min: 1000, max: 9999 };

      const validRes = validateValue('PORT', '8080', rule);
      expect(validRes.valid).toBe(true);
      expect(validRes.parsedValue).toBe(8080);

      const tooLow = validateValue('PORT', '80', rule);
      expect(tooLow.valid).toBe(false);
      expect(tooLow.type).toBe('below_minimum');

      const tooHigh = validateValue('PORT', '10000', rule);
      expect(tooHigh.valid).toBe(false);
      expect(tooHigh.type).toBe('above_maximum');

      const nanRes = validateValue('PORT', 'not-a-number', rule);
      expect(nanRes.valid).toBe(false);
      expect(nanRes.type).toBe('invalid_number');
    });

    test('validates port type specifically', () => {
      const rule = { required: true, type: 'port' };
      expect(validateValue('PORT', '8080', rule).valid).toBe(true);
      expect(validateValue('PORT', '0', rule).valid).toBe(false);
      expect(validateValue('PORT', '70000', rule).valid).toBe(false);
      expect(validateValue('PORT', '3000.5', rule).valid).toBe(false);
    });

    test('validates choices enum constraint', () => {
      const rule = { required: true, choices: ['development', 'production', 'test'] };
      expect(validateValue('NODE_ENV', 'production', rule).valid).toBe(true);
      const invalid = validateValue('NODE_ENV', 'staging', rule);
      expect(invalid.valid).toBe(false);
      expect(invalid.type).toBe('invalid_choice');
    });

    test('validates string min and max length', () => {
      const rule = { required: true, type: 'string', minLength: 5, maxLength: 10 };
      expect(validateValue('KEY', '123456', rule).valid).toBe(true);
      expect(validateValue('KEY', '123', rule).valid).toBe(false);
      expect(validateValue('KEY', '12345678901', rule).valid).toBe(false);
    });

    test('validates regex patterns', () => {
      const rule = { required: true, regex: /^sk_[a-z0-9]{8}$/ };
      expect(validateValue('API_KEY', 'sk_12345678', rule).valid).toBe(true);
      expect(validateValue('API_KEY', 'pk_invalid', rule).valid).toBe(false);
    });

    test('supports custom validation functions returning boolean or error string', () => {
      const ruleBoolean = {
        required: true,
        validate: (val) => val.startsWith('https://')
      };
      expect(validateValue('WEBHOOK', 'https://api.com', ruleBoolean).valid).toBe(true);
      expect(validateValue('WEBHOOK', 'http://insecure.com', ruleBoolean).valid).toBe(false);

      const ruleCustomMsg = {
        required: true,
        validate: (val) => (val.length >= 10 ? true : 'Must be at least 10 chars')
      };
      const res = validateValue('PASS', 'short', ruleCustomMsg);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Must be at least 10 chars');
    });

    test('never exposes secret values in error messages', () => {
      const secret = 'super_secret_password_123';
      const rule = { required: true, type: 'number' };
      const res = validateValue('API_SECRET', secret, rule);
      expect(res.valid).toBe(false);
      expect(res.error).not.toContain(secret);
      expect(res.error).toContain('API_SECRET');
    });
  });
});
