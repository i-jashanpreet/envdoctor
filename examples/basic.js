'use strict';

// In an installed application: const { checkEnv, formatReport } = require('envdoctor');
const { checkEnv, formatReport } = require('../src');

// Mock environment variables for demonstration
const mockEnv = {
  PORT: '8080',
  DATABASE_URL: 'postgres://postgres:secret@localhost:5432/app_db',
  API_KEY: 'sk_live_123456789'
};

console.log('--- 1. Valid Configuration Example ---');
const validResult = checkEnv(
  {
    required: ['PORT', 'DATABASE_URL', 'API_KEY']
  },
  mockEnv
);

console.log(formatReport(validResult));

console.log('\n--- 2. Missing Configuration Example ---');
const missingResult = checkEnv(
  {
    required: ['PORT', 'DATABASE_URL', 'STRIPE_SECRET_KEY', 'REDIS_HOST']
  },
  mockEnv
);

console.log(formatReport(missingResult));
