'use strict';

const fs = require('fs');
const path = require('path');
const { parseEnv, parseEnvFile } = require('./envParser');

/**
 * Compares two environment variable dictionaries (e.g., .env vs .env.example).
 * Never exposes actual variable values.
 *
 * @param {Record<string, string>} envObj - Key-value map of actual environment
 * @param {Record<string, string>} exampleObj - Key-value map of template (.env.example)
 * @returns {object} Comparison results
 */
function compareEnvObjects(envObj = {}, exampleObj = {}) {
  const envKeys = Object.keys(envObj);
  const exampleKeys = Object.keys(exampleObj);

  const envKeySet = new Set(envKeys);
  const exampleKeySet = new Set(exampleKeys);

  // Variables present in .env.example but missing entirely from .env
  const missing = exampleKeys.filter((key) => !envKeySet.has(key));

  // Variables present in .env but absent from .env.example (untracked/extra)
  const extra = envKeys.filter((key) => !exampleKeySet.has(key));

  // Variables present in .env that have empty values
  const empty = envKeys.filter((key) => {
    const val = envObj[key];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });

  // Variables present in both and non-empty
  const present = exampleKeys.filter((key) => {
    if (!envKeySet.has(key)) return false;
    const val = envObj[key];
    return val !== undefined && val !== null && (typeof val !== 'string' || val.trim() !== '');
  });

  const valid = missing.length === 0 && empty.length === 0;

  return {
    valid,
    missing,
    extra,
    empty,
    present,
    summary: {
      totalExample: exampleKeys.length,
      totalEnv: envKeys.length,
      missingCount: missing.length,
      extraCount: extra.length,
      emptyCount: empty.length,
      presentCount: present.length
    }
  };
}

/**
 * Compares .env file with .env.example file on disk.
 *
 * @param {string} envPath - Path to .env file
 * @param {string} examplePath - Path to .env.example file
 * @returns {object} Comparison results
 */
function compareEnvFiles(envPath = '.env', examplePath = '.env.example') {
  const resolvedEnvPath = path.resolve(process.cwd(), envPath);
  const resolvedExamplePath = path.resolve(process.cwd(), examplePath);

  const envExists = fs.existsSync(resolvedEnvPath);
  const exampleExists = fs.existsSync(resolvedExamplePath);

  if (!exampleExists) {
    throw new Error(`Template file not found at: ${resolvedExamplePath}`);
  }

  const envObj = envExists ? parseEnvFile(resolvedEnvPath) : {};
  const exampleObj = parseEnvFile(resolvedExamplePath);

  const result = compareEnvObjects(envObj, exampleObj);
  result.envExists = envExists;
  result.exampleExists = exampleExists;
  result.envPath = resolvedEnvPath;
  result.examplePath = resolvedExamplePath;

  return result;
}

/**
 * High-level comparator function supporting either file paths or raw objects.
 *
 * @param {object} [options={}]
 * @returns {object} Comparison results
 */
function compareEnv(options = {}) {
  if (options.env && typeof options.env === 'object' && options.example && typeof options.example === 'object') {
    return compareEnvObjects(options.env, options.example);
  }

  const envPath = options.envPath || '.env';
  const examplePath = options.examplePath || '.env.example';

  return compareEnvFiles(envPath, examplePath);
}

module.exports = {
  compareEnv,
  compareEnvFiles,
  compareEnvObjects
};
