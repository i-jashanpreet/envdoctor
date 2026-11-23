'use strict';

const path = require('path');
const fs = require('fs');
const { parseEnv, parseEnvFile } = require('../src/envParser');

describe('envParser', () => {
  test('parses basic KEY=value pairs', () => {
    const input = 'PORT=3000\nHOST=localhost\nDEBUG=true';
    const result = parseEnv(input);
    expect(result).toEqual({
      PORT: '3000',
      HOST: 'localhost',
      DEBUG: 'true'
    });
  });

  test('handles double and single quoted values', () => {
    const input = `
      DOUBLE="hello world"
      SINGLE='single quoted'
      ESCAPED="line1\\nline2\\ttab"
    `;
    const result = parseEnv(input);
    expect(result.DOUBLE).toBe('hello world');
    expect(result.SINGLE).toBe('single quoted');
    expect(result.ESCAPED).toBe('line1\nline2\ttab');
  });

  test('handles export prefix', () => {
    const input = 'export DATABASE_URL=postgres://localhost/db\nexport API_KEY=secret';
    const result = parseEnv(input);
    expect(result.DATABASE_URL).toBe('postgres://localhost/db');
    expect(result.API_KEY).toBe('secret');
  });

  test('skips empty lines and comment lines', () => {
    const input = `
      # This is a comment
      PORT=8080

      # Another comment
      API_KEY=xyz
    `;
    const result = parseEnv(input);
    expect(result).toEqual({
      PORT: '8080',
      API_KEY: 'xyz'
    });
  });

  test('handles inline comments on unquoted values', () => {
    const input = 'PORT=5000 # Server port\nURL=http://localhost:3000';
    const result = parseEnv(input);
    expect(result.PORT).toBe('5000');
    expect(result.URL).toBe('http://localhost:3000');
  });

  test('handles empty values', () => {
    const input = 'EMPTY_VAL=\nSPACES_VAL=   ';
    const result = parseEnv(input);
    expect(result.EMPTY_VAL).toBe('');
    expect(result.SPACES_VAL).toBe('');
  });

  test('handles multiline quoted values', () => {
    const input = 'PRIVATE_KEY="-----BEGIN KEY-----\nabc\n-----END KEY-----"';
    const result = parseEnv(input);
    expect(result.PRIVATE_KEY).toBe('-----BEGIN KEY-----\nabc\n-----END KEY-----');
  });

  test('returns empty object for invalid or non-string inputs', () => {
    expect(parseEnv(null)).toEqual({});
    expect(parseEnv(undefined)).toEqual({});
    expect(parseEnv(12345)).toEqual({});
  });

  test('parseEnvFile returns parsed content for existing file and empty for missing file', () => {
    const tempFile = path.resolve(__dirname, 'temp.test.env');
    fs.writeFileSync(tempFile, 'TEST_ENV_KEY=sample_val\n');
    try {
      const parsed = parseEnvFile(tempFile);
      expect(parsed.TEST_ENV_KEY).toBe('sample_val');

      const nonExistent = parseEnvFile(path.resolve(__dirname, 'non_existent.env'));
      expect(nonExistent).toEqual({});
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});
