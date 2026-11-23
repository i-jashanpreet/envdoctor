'use strict';

const { validateValue } = require('./validator');

/**
 * Validates the current runtime environment (or a custom dictionary)
 * against a schema or list of required variable names.
 *
 * @param {object} config - Configuration object
 * @param {string[]} [config.required] - List of required variable names
 * @param {Record<string, object|string>} [config.variables] - Detailed variable schemas
 * @param {Record<string, any>} [config.env] - Custom env object (defaults to process.env)
 * @param {boolean} [config.allowEmpty=false] - Whether to allow empty strings by default
 * @param {boolean} [config.throwOnError=false] - Throw an Error if validation fails
 * @param {Record<string, any>} [customEnv] - Alternative way to supply custom env object
 * @returns {object} Validation result
 */
function checkEnv(config, customEnv) {
  // Graceful input validation
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Invalid configuration: config must be a non-null object');
  }

  if (config.required !== undefined && !Array.isArray(config.required)) {
    throw new TypeError('Invalid configuration: "required" must be an array of variable names');
  }

  if (config.variables !== undefined && (typeof config.variables !== 'object' || Array.isArray(config.variables) || config.variables === null)) {
    throw new TypeError('Invalid configuration: "variables" must be an object');
  }

  const env = config.env || customEnv || process.env || {};
  const allowEmptyDefault = Boolean(config.allowEmpty);

  // Consolidated map of variable rules
  const rules = {};

  // 1. Process config.required array
  if (Array.isArray(config.required)) {
    for (const item of config.required) {
      if (typeof item === 'string' && item.trim()) {
        const key = item.trim();
        rules[key] = { required: true, allowEmpty: allowEmptyDefault };
      }
    }
  }

  // 2. Process config.variables object
  if (config.variables) {
    for (const [key, rule] of Object.entries(config.variables)) {
      if (typeof rule === 'string') {
        rules[key] = {
          ...(rules[key] || {}),
          type: rule,
          allowEmpty: allowEmptyDefault
        };
      } else if (rule && typeof rule === 'object') {
        rules[key] = {
          ...(rules[key] || {}),
          allowEmpty: allowEmptyDefault,
          ...rule
        };
      }
    }
  }

  const variableNames = Object.keys(rules);
  const errors = [];
  const warnings = [];
  const results = {};
  let passedCount = 0;

  for (const name of variableNames) {
    const rule = rules[name];
    const rawVal = env[name];

    const validation = validateValue(name, rawVal, rule, env);

    if (validation.valid) {
      passedCount++;
      results[name] = {
        valid: true,
        status: 'VALID',
        parsedValue: validation.parsedValue
      };
    } else {
      let status = 'INVALID';
      if (validation.type === 'missing') {
        status = 'MISSING';
      } else if (validation.type === 'empty') {
        status = 'EMPTY';
      }

      const errorEntry = {
        variable: name,
        type: validation.type,
        status,
        message: validation.error || `${name} failed validation`
      };

      errors.push(errorEntry);
      results[name] = {
        valid: false,
        status,
        error: errorEntry.message
      };
    }
  }

  const isValid = errors.length === 0;

  const result = {
    valid: isValid,
    errors,
    warnings,
    results,
    summary: {
      total: variableNames.length,
      passed: passedCount,
      failed: errors.length,
      warnings: warnings.length
    }
  };

  if (!isValid && config.throwOnError) {
    const issueWord = errors.length === 1 ? 'issue' : 'issues';
    const err = new Error(`EnvDoctor: ${errors.length} configuration ${issueWord} found:\n` + errors.map((e) => `  - ${e.message}`).join('\n'));
    err.errors = errors;
    err.results = results;
    throw err;
  }

  return result;
}

module.exports = {
  checkEnv
};
