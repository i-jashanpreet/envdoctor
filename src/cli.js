#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseEnvFile } = require('./envParser');
const { checkEnv } = require('./checker');
const { compareEnvFiles } = require('./comparator');
const { formatCheckReport, formatComparisonReport } = require('./reporter');

const pkg = require('../package.json');

/**
 * Prints CLI help instructions.
 */
function showHelp() {
  const helpText = `
EnvDoctor v${pkg.version}
The lightweight environment variable health checker for Node.js.

USAGE:
  npx envdoctor [options]
  envdoctor [options]

OPTIONS:
  -e, --env <path>       Path to .env file (default: .env)
  -t, --example <path>   Path to .env.example file (default: .env.example)
  -c, --config <path>    Path to envdoctor.config.js
  --strict               Strict mode: fail if extra untracked variables exist
  --no-color             Disable colored terminal output
  -s, --silent           Suppress all output (exit code only)
  -v, --version          Show version number
  -h, --help             Show this help guide

EXAMPLES:
  $ npx envdoctor
  $ npx envdoctor --env .env.local --example .env.template
  $ npx envdoctor --strict
`;
  process.stdout.write(helpText.trim() + '\n\n');
}

/**
 * Minimal, zero-dependency argument parser.
 *
 * @param {string[]} args - CLI arguments (process.argv.slice(2))
 * @returns {object} Parsed flags
 */
function parseArgs(args) {
  const flags = {
    env: '.env',
    example: '.env.example',
    exampleExplicit: false,
    config: null,
    strict: false,
    noColor: false,
    silent: false,
    help: false,
    version: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      flags.help = true;
    } else if (arg === '-v' || arg === '--version') {
      flags.version = true;
    } else if (arg === '--strict') {
      flags.strict = true;
    } else if (arg === '--no-color') {
      flags.noColor = true;
    } else if (arg === '-s' || arg === '--silent') {
      flags.silent = true;
    } else if (arg === '-e' || arg === '--env') {
      flags.env = args[++i];
    } else if (arg.startsWith('--env=')) {
      flags.env = arg.split('=')[1];
    } else if (arg === '-t' || arg === '--example') {
      flags.example = args[++i];
      flags.exampleExplicit = true;
    } else if (arg.startsWith('--example=')) {
      flags.example = arg.split('=')[1];
      flags.exampleExplicit = true;
    } else if (arg === '-c' || arg === '--config') {
      flags.config = args[++i];
    } else if (arg.startsWith('--config=')) {
      flags.config = arg.split('=')[1];
    }
  }

  return flags;
}

/**
 * Attempts to load user config file if present.
 *
 * @param {string|null} customConfigPath
 * @returns {object|null}
 */
function loadUserConfig(customConfigPath) {
  const cwd = process.cwd();

  const candidates = customConfigPath
    ? [path.resolve(cwd, customConfigPath)]
    : [
        path.resolve(cwd, 'envdoctor.config.js'),
        path.resolve(cwd, '.envdoctorrc.js'),
        path.resolve(cwd, '.envdoctorrc.json')
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const loaded = require(candidate);
        return typeof loaded === 'function' ? loaded() : loaded;
      } catch (err) {
        throw new Error(`Failed to load configuration file at "${candidate}": ${err.message}`);
      }
    }
  }

  // Check package.json "envdoctor" property
  const packageJsonPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageData = require(packageJsonPath);
      if (packageData.envdoctor && typeof packageData.envdoctor === 'object') {
        return packageData.envdoctor;
      }
    } catch {
      // Ignore package.json parse errors
    }
  }

  return null;
}

/**
 * Main CLI execution entry point.
 *
 * @param {string[]} [cliArgs] - Optional args for testing
 * @returns {number} Exit code (0 for success, 1 for failure)
 */
function runCli(cliArgs = process.argv.slice(2)) {
  const flags = parseArgs(cliArgs);

  if (flags.help) {
    showHelp();
    return 0;
  }

  if (flags.version) {
    process.stdout.write(`v${pkg.version}\n`);
    return 0;
  }

  const cwd = process.cwd();
  const envFilePath = path.resolve(cwd, flags.env);

  let exampleFilePath = null;
  let exampleExists = false;

  if (flags.exampleExplicit) {
    exampleFilePath = path.resolve(cwd, flags.example);
    exampleExists = fs.existsSync(exampleFilePath);
  } else if (flags.env === '.env') {
    exampleFilePath = path.resolve(cwd, '.env.example');
    exampleExists = fs.existsSync(exampleFilePath);
  } else {
    // Custom --env passed without explicit --example:
    // Only check if an adjacent .env.example exists next to the specified env file
    const adjacentExample = path.resolve(path.dirname(envFilePath), '.env.example');
    if (fs.existsSync(adjacentExample)) {
      exampleFilePath = adjacentExample;
      exampleExists = true;
    }
  }

  const envExists = fs.existsSync(envFilePath);

  let userConfig = null;
  try {
    userConfig = loadUserConfig(flags.config);
  } catch (err) {
    if (!flags.silent) {
      process.stderr.write(`Configuration Error: ${err.message}\n`);
    }
    return 1;
  }

  if (!envExists && !exampleExists && !userConfig) {
    if (!flags.silent) {
      process.stderr.write(
        `EnvDoctor Error: No environment or configuration files found.\n` +
          `Expected "${flags.env}" or "${flags.example}" in ${cwd}.\n` +
          `Run "npx envdoctor --help" for available options.\n`
      );
    }
    return 1;
  }

  // Load environment variables from .env file merged over process.env
  const fileEnv = envExists ? parseEnvFile(envFilePath) : {};
  // For CLI checking, the fileEnv takes precedence or combines with process.env
  const activeEnv = { ...process.env, ...fileEnv };

  let allChecksPassed = true;

  // Case A: User has provided a schema / config file
  if (userConfig) {
    let checkResult;
    try {
      checkResult = checkEnv(userConfig, activeEnv);
    } catch (err) {
      if (!flags.silent) {
        process.stderr.write(`Validation Error: ${err.message}\n`);
      }
      return 1;
    }

    if (!checkResult.valid) {
      allChecksPassed = false;
    }

    if (!flags.silent) {
      const output = formatCheckReport(checkResult, {
        noColor: flags.noColor,
        verbose: true
      });
      if (checkResult.valid) {
        process.stdout.write(output + '\n');
      } else {
        process.stderr.write(output + '\n');
      }
    }
  }

  // Case B: .env.example exists, perform template audit
  if (exampleExists && exampleFilePath) {
    const comparison = compareEnvFiles(envFilePath, exampleFilePath);

    let comparisonValid = comparison.valid;
    if (flags.strict && comparison.extra.length > 0) {
      comparisonValid = false;
    }

    if (!comparisonValid) {
      allChecksPassed = false;
    }

    // If userConfig wasn't provided, also run checkEnv using example keys as required
    if (!userConfig) {
      const exampleVars = parseEnvFile(exampleFilePath);
      const requiredKeys = Object.keys(exampleVars);

      const checkResult = checkEnv(
        {
          required: requiredKeys
        },
        fileEnv // Check directly against the file values so empty file values are caught!
      );

      if (!checkResult.valid) {
        allChecksPassed = false;
      }

      if (!flags.silent) {
        const output = formatCheckReport(checkResult, {
          noColor: flags.noColor
        });
        if (checkResult.valid) {
          process.stdout.write(output + '\n');
        } else {
          process.stderr.write(output + '\n');
        }
      }
    } else if (!flags.silent) {
      // Print comparison report alongside check report
      const output = formatComparisonReport(comparison, {
        noColor: flags.noColor
      });
      if (comparisonValid) {
        process.stdout.write(output + '\n');
      } else {
        process.stderr.write(output + '\n');
      }
    }
  } else if (!userConfig && envExists) {
    // Only .env exists without example or config
    // Report all non-empty vs empty keys in .env
    const requiredKeys = Object.keys(fileEnv);
    const checkResult = checkEnv({ required: requiredKeys }, fileEnv);

    if (!checkResult.valid) {
      allChecksPassed = false;
    }

    if (!flags.silent) {
      const output = formatCheckReport(checkResult, {
        noColor: flags.noColor
      });
      if (checkResult.valid) {
        process.stdout.write(output + '\n');
      } else {
        process.stderr.write(output + '\n');
      }
    }
  }

  return allChecksPassed ? 0 : 1;
}

// When executed directly from the command line
if (require.main === module) {
  const exitCode = runCli();
  process.exit(exitCode);
}

module.exports = {
  runCli,
  parseArgs,
  loadUserConfig
};
