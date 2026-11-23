'use strict';

const { checkEnv } = require('../src/checker');

describe('checkEnv', () => {
  const completeEnv = {
    PORT: '3000',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    API_KEY: 'sk_live_xyz123'
  };

  test('passes when all required variables are present', () => {
    const result = checkEnv(
      {
        required: ['PORT', 'DATABASE_URL', 'API_KEY']
      },
      completeEnv
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.total).toBe(3);
    expect(result.summary.passed).toBe(3);
    expect(result.summary.failed).toBe(0);
    expect(result.results.PORT.status).toBe('VALID');
    expect(result.results.DATABASE_URL.status).toBe('VALID');
    expect(result.results.API_KEY.status).toBe('VALID');
  });

  test('identifies missing environment variables', () => {
    const incompleteEnv = {
      PORT: '3000'
    };

    const result = checkEnv(
      {
        required: ['PORT', 'DATABASE_URL', 'API_KEY']
      },
      incompleteEnv
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((e) => e.variable)).toEqual(['DATABASE_URL', 'API_KEY']);
    expect(result.results.DATABASE_URL.status).toBe('MISSING');
    expect(result.results.API_KEY.status).toBe('MISSING');
  });

  test('identifies empty environment variables', () => {
    const emptyEnv = {
      PORT: '3000',
      DATABASE_URL: '',
      API_KEY: '   '
    };

    const result = checkEnv(
      {
        required: ['PORT', 'DATABASE_URL', 'API_KEY']
      },
      emptyEnv
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.results.DATABASE_URL.status).toBe('EMPTY');
    expect(result.results.API_KEY.status).toBe('EMPTY');
  });

  test('validates schema variables with types and bounds', () => {
    const validEnv = {
      PORT: '8080',
      DATABASE_URL: 'https://example.com/api',
      DEBUG: 'true'
    };

    const result = checkEnv(
      {
        variables: {
          PORT: { required: true, type: 'number', min: 1, max: 65535 },
          DATABASE_URL: { required: true, type: 'url' },
          DEBUG: { required: false, type: 'boolean' }
        }
      },
      validEnv
    );

    expect(result.valid).toBe(true);
    expect(result.summary.passed).toBe(3);
    expect(result.results.PORT.parsedValue).toBe(8080);
    expect(result.results.DEBUG.parsedValue).toBe(true);
  });

  test('merges required array and variables object', () => {
    const env = {
      PORT: '3000',
      DATABASE_URL: 'postgres://localhost/db',
      SECRET: 'token'
    };

    const result = checkEnv(
      {
        required: ['PORT'],
        variables: {
          DATABASE_URL: { required: true, type: 'url' },
          SECRET: { required: true }
        }
      },
      env
    );

    expect(result.valid).toBe(true);
    expect(result.summary.total).toBe(3);
  });

  test('handles invalid configuration input gracefully', () => {
    expect(() => checkEnv(null)).toThrow(TypeError);
    expect(() => checkEnv(undefined)).toThrow(TypeError);
    expect(() => checkEnv('string')).toThrow(TypeError);
    expect(() => checkEnv({ required: 'not-an-array' })).toThrow(TypeError);
    expect(() => checkEnv({ variables: 'not-an-object' })).toThrow(TypeError);
  });

  test('throws error when throwOnError is set to true', () => {
    expect(() => {
      checkEnv(
        {
          required: ['MISSING_VAR'],
          throwOnError: true
        },
        {}
      );
    }).toThrow(/EnvDoctor: 1 configuration issue found/);
  });
});
