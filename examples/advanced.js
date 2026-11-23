'use strict';

const { checkEnv, formatReport } = require('../src');

const sampleEnv = {
  PORT: '3000',
  DATABASE_URL: 'postgres://app:pass@db.example.com:5432/production_db',
  ADMIN_EMAIL: 'support@example.com',
  NODE_ENV: 'production',
  DEBUG: 'false',
  MAX_CONNECTIONS: '25',
  JWT_SECRET: 'super-secure-long-random-key-12345'
};

console.log('--- Advanced Schema & Type Validation ---');

const result = checkEnv(
  {
    variables: {
      PORT: {
        required: true,
        type: 'number',
        min: 1,
        max: 65535
      },
      DATABASE_URL: {
        required: true,
        type: 'url'
      },
      ADMIN_EMAIL: {
        required: true,
        type: 'email'
      },
      NODE_ENV: {
        required: true,
        type: 'string',
        choices: ['development', 'test', 'staging', 'production']
      },
      DEBUG: {
        required: false,
        type: 'boolean'
      },
      MAX_CONNECTIONS: {
        required: true,
        type: 'number',
        min: 1,
        max: 100
      },
      JWT_SECRET: {
        required: true,
        type: 'string',
        validate: (secret) => {
          if (secret.length < 16) {
            return 'JWT_SECRET must be at least 16 characters long for cryptographic security';
          }
          return true;
        }
      }
    }
  },
  sampleEnv
);

console.log(formatReport(result, { verbose: true }));

if (!result.valid) {
  console.error('Validation failed! Exiting application...');
  process.exit(1);
} else {
  console.log('Server starting successfully on port', sampleEnv.PORT);
}
