'use strict';

const path = require('path');
const fs = require('fs');
const { runCli, parseArgs } = require('../src/cli');

describe('CLI Tool', () => {
  const tempDir = path.resolve(__dirname, 'cli-sandbox');
  const tempEnv = path.resolve(tempDir, '.env');
  const tempExample = path.resolve(tempDir, '.env.example');
  const tempConfig = path.resolve(tempDir, 'envdoctor.config.js');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseArgs', () => {
    test('parses flags correctly', () => {
      const args = ['--env', 'custom.env', '--example', 'custom.example', '--strict', '--silent', '--no-color'];
      const flags = parseArgs(args);
      expect(flags.env).toBe('custom.env');
      expect(flags.example).toBe('custom.example');
      expect(flags.strict).toBe(true);
      expect(flags.silent).toBe(true);
      expect(flags.noColor).toBe(true);
    });

    test('parses equals format (--env=path)', () => {
      const flags = parseArgs(['--env=.env.test', '--example=.env.template']);
      expect(flags.env).toBe('.env.test');
      expect(flags.example).toBe('.env.template');
    });
  });

  describe('runCli execution', () => {
    test('exits with 0 on --help', () => {
      const exitCode = runCli(['--help', '--silent']);
      expect(exitCode).toBe(0);
    });

    test('exits with 0 on --version', () => {
      const exitCode = runCli(['--version', '--silent']);
      expect(exitCode).toBe(0);
    });

    test('exits with 0 when environment matches .env.example', () => {
      fs.writeFileSync(tempExample, 'PORT=3000\nDATABASE_URL=\nAPI_KEY=\n');
      fs.writeFileSync(tempEnv, 'PORT=3000\nDATABASE_URL=postgres://localhost/db\nAPI_KEY=secret_key\n');

      const exitCode = runCli([
        '--env', tempEnv,
        '--example', tempExample,
        '--silent'
      ]);

      expect(exitCode).toBe(0);
    });

    test('exits with 1 when .env is missing required variables', () => {
      fs.writeFileSync(tempExample, 'PORT=3000\nDATABASE_URL=\nAPI_KEY=\n');
      fs.writeFileSync(tempEnv, 'PORT=3000\n'); // missing DATABASE_URL and API_KEY

      const exitCode = runCli([
        '--env', tempEnv,
        '--example', tempExample,
        '--silent'
      ]);

      expect(exitCode).toBe(1);
    });

    test('exits with 1 when .env has empty values for required variables', () => {
      fs.writeFileSync(tempExample, 'PORT=3000\nAPI_KEY=\n');
      fs.writeFileSync(tempEnv, 'PORT=3000\nAPI_KEY=\n'); // API_KEY is empty

      const exitCode = runCli([
        '--env', tempEnv,
        '--example', tempExample,
        '--silent'
      ]);

      expect(exitCode).toBe(1);
    });

    test('exits with 1 in strict mode when extra untracked variables exist', () => {
      fs.writeFileSync(tempExample, 'PORT=3000\n');
      fs.writeFileSync(tempEnv, 'PORT=3000\nUNTRACKED_KEY=value\n');

      const exitCode = runCli([
        '--env', tempEnv,
        '--example', tempExample,
        '--strict',
        '--silent'
      ]);

      expect(exitCode).toBe(1);
    });

    test('validates custom config file with schema', () => {
      fs.writeFileSync(
        tempConfig,
        `module.exports = {
          variables: {
            PORT: { required: true, type: 'number', min: 1000, max: 9000 },
            API_URL: { required: true, type: 'url' }
          }
        };`
      );
      fs.writeFileSync(tempEnv, 'PORT=8080\nAPI_URL=https://api.example.com\n');

      const exitCodeSuccess = runCli([
        '--config', tempConfig,
        '--env', tempEnv,
        '--silent'
      ]);
      expect(exitCodeSuccess).toBe(0);

      // Invalidate PORT
      fs.writeFileSync(tempEnv, 'PORT=99999\nAPI_URL=https://api.example.com\n');
      const exitCodeFail = runCli([
        '--config', tempConfig,
        '--env', tempEnv,
        '--silent'
      ]);
      expect(exitCodeFail).toBe(1);
    });

    test('exits with 1 when neither env file nor example exists', () => {
      const exitCode = runCli([
        '--env', path.resolve(tempDir, 'non_existent.env'),
        '--example', path.resolve(tempDir, 'non_existent.example'),
        '--silent'
      ]);
      expect(exitCode).toBe(1);
    });
  });
});
