'use strict';

const { checkEnv } = require('./checker');
const { compareEnv, compareEnvFiles, compareEnvObjects } = require('./comparator');
const { parseEnv, parseEnvFile } = require('./envParser');
const { validateValue, isValidUrl, isValidEmail, isBooleanLike, parseBoolean, isValidNumber } = require('./validator');
const reporter = require('./reporter');

/**
 * Convenience class for applications managing environment validation lifecycles.
 */
class EnvDoctor {
  constructor(config = {}) {
    this.config = config;
  }

  check(customEnv) {
    return checkEnv(this.config, customEnv);
  }

  static check(config, customEnv) {
    return checkEnv(config, customEnv);
  }

  static compare(options) {
    return compareEnv(options);
  }

  static parse(content) {
    return parseEnv(content);
  }
}

module.exports = {
  // Core functionality
  checkEnv,
  compareEnv,
  compareEnvFiles,
  compareEnvObjects,

  // Parsing & File utilities
  parseEnv,
  parseEnvFile,

  // Validation primitives
  validateValue,
  isValidUrl,
  isValidEmail,
  isBooleanLike,
  parseBoolean,
  isValidNumber,

  // Reporting
  formatReport: reporter.formatCheckReport,
  formatCheckReport: reporter.formatCheckReport,
  formatComparisonReport: reporter.formatComparisonReport,
  printCheckReport: reporter.printCheckReport,
  printComparisonReport: reporter.printComparisonReport,
  reporter,

  // Class API
  EnvDoctor
};
