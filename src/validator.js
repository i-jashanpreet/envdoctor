'use strict';

/**
 * Standard email validation regular expression (RFC 5322 compatible simplification).
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Recognizable boolean string representations.
 */
const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'enabled']);
const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'disabled']);

/**
 * Checks if a value is a valid URL with an allowed protocol.
 * Supports web URLs as well as database connection strings (postgres://, mongodb://, redis://, etc.)
 *
 * @param {string} val
 * @returns {boolean}
 */
function isValidUrl(val) {
  if (typeof val !== 'string' || val.trim().length === 0) {
    return false;
  }
  try {
    const parsed = new URL(val);
    return Boolean(parsed.protocol && parsed.protocol.length > 1);
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid email address.
 *
 * @param {string} val
 * @returns {boolean}
 */
function isValidEmail(val) {
  if (typeof val !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(val.trim());
}

/**
 * Checks if a value represents a boolean.
 *
 * @param {any} val
 * @returns {boolean}
 */
function isBooleanLike(val) {
  if (typeof val === 'boolean') {
    return true;
  }
  if (typeof val !== 'string') {
    return false;
  }
  const normalized = val.trim().toLowerCase();
  return BOOLEAN_TRUE_VALUES.has(normalized) || BOOLEAN_FALSE_VALUES.has(normalized);
}

/**
 * Parses a boolean-like value into a boolean.
 *
 * @param {any} val
 * @returns {boolean}
 */
function parseBoolean(val) {
  if (typeof val === 'boolean') {
    return val;
  }
  if (typeof val === 'string') {
    return BOOLEAN_TRUE_VALUES.has(val.trim().toLowerCase());
  }
  return Boolean(val);
}

/**
 * Checks if a value represents a valid finite number.
 *
 * @param {any} val
 * @returns {boolean}
 */
function isValidNumber(val) {
  if (typeof val === 'number') {
    return Number.isFinite(val);
  }
  if (typeof val !== 'string' || val.trim() === '') {
    return false;
  }
  const num = Number(val.trim());
  return !Number.isNaN(num) && Number.isFinite(num);
}

/**
 * Validates an environment variable value against specified schema rules.
 * Does NOT expose secret values in returned error messages.
 *
 * @param {string} name - Variable name
 * @param {any} rawValue - Raw value from environment or file
 * @param {object|string} rule - Validation configuration or shorthand type
 * @param {object} [allEnv={}] - Complete env dictionary for cross-field checks
 * @returns {{ valid: boolean, type?: string, error?: string, parsedValue?: any }}
 */
function validateValue(name, rawValue, rule = {}, allEnv = {}) {
  // Normalize shorthand type string: e.g. 'number' -> { type: 'number' }
  const config = typeof rule === 'string' ? { type: rule } : { ...rule };

  const isPresent = rawValue !== undefined && rawValue !== null;
  const isString = typeof rawValue === 'string';
  const isEmptyString = isString && rawValue.trim() === '';
  const isRequired = Boolean(config.required);
  const allowEmpty = Boolean(config.allowEmpty);

  // 1. Check Missing
  if (!isPresent) {
    if (isRequired) {
      return {
        valid: false,
        type: 'missing',
        error: `${name} is required but missing`
      };
    }
    // Optional variable not provided: valid
    return {
      valid: true,
      parsedValue: config.default !== undefined ? config.default : undefined
    };
  }

  // 2. Check Empty
  if (isEmptyString) {
    if (isRequired && !allowEmpty) {
      return {
        valid: false,
        type: 'empty',
        error: `${name} is required but has an empty value`
      };
    }
    if (!isRequired && !allowEmpty && config.type) {
      // Optional variable present but empty string: if a specific type is expected, empty is invalid unless allowEmpty
      return {
        valid: false,
        type: 'empty',
        error: `${name} is empty (expected ${config.type})`
      };
    }
    return {
      valid: true,
      parsedValue: ''
    };
  }

  const strValue = String(rawValue).trim();
  let parsedValue = rawValue;

  // 3. Type Validation
  if (config.type) {
    const expectedType = String(config.type).toLowerCase();

    switch (expectedType) {
      case 'string': {
        parsedValue = strValue;
        if (config.minLength !== undefined && strValue.length < config.minLength) {
          return {
            valid: false,
            type: 'length_too_short',
            error: `${name} length must be at least ${config.minLength} characters`
          };
        }
        if (config.maxLength !== undefined && strValue.length > config.maxLength) {
          return {
            valid: false,
            type: 'length_too_long',
            error: `${name} length must not exceed ${config.maxLength} characters`
          };
        }
        break;
      }

      case 'number':
      case 'integer':
      case 'port': {
        if (!isValidNumber(strValue)) {
          return {
            valid: false,
            type: 'invalid_number',
            error: `${name} must be a valid ${expectedType}`
          };
        }
        const num = Number(strValue);
        if (expectedType === 'integer' && !Number.isInteger(num)) {
          return {
            valid: false,
            type: 'invalid_integer',
            error: `${name} must be an integer`
          };
        }
        if (expectedType === 'port') {
          if (!Number.isInteger(num) || num < 1 || num > 65535) {
            return {
              valid: false,
              type: 'invalid_port',
              error: `${name} must be a valid port number (1-65535)`
            };
          }
        }
        parsedValue = num;
        break;
      }

      case 'boolean': {
        if (!isBooleanLike(strValue)) {
          return {
            valid: false,
            type: 'invalid_boolean',
            error: `${name} must be a boolean (true/false, 1/0, yes/no)`
          };
        }
        parsedValue = parseBoolean(strValue);
        break;
      }

      case 'url': {
        if (!isValidUrl(strValue)) {
          return {
            valid: false,
            type: 'invalid_url',
            error: `${name} must be a valid URL`
          };
        }
        parsedValue = strValue;
        break;
      }

      case 'email': {
        if (!isValidEmail(strValue)) {
          return {
            valid: false,
            type: 'invalid_email',
            error: `${name} must be a valid email address`
          };
        }
        parsedValue = strValue;
        break;
      }

      default:
        // Unknown type: if custom type validator isn't used, warn or pass
        break;
    }
  }

  // 4. Numeric Bounds (min / max)
  if (typeof parsedValue === 'number') {
    if (config.min !== undefined && parsedValue < config.min) {
      return {
        valid: false,
        type: 'below_minimum',
        error: `${name} must be greater than or equal to ${config.min}`
      };
    }
    if (config.max !== undefined && parsedValue > config.max) {
      return {
        valid: false,
        type: 'above_maximum',
        error: `${name} must be less than or equal to ${config.max}`
      };
    }
  } else if (typeof parsedValue === 'string') {
    // String min / max bounds (length)
    if (config.min !== undefined && parsedValue.length < config.min) {
      return {
        valid: false,
        type: 'length_too_short',
        error: `${name} length must be at least ${config.min} characters`
      };
    }
    if (config.max !== undefined && parsedValue.length > config.max) {
      return {
        valid: false,
        type: 'length_too_long',
        error: `${name} length must not exceed ${config.max} characters`
      };
    }
  }

  // 5. Allowed Choices / Enum
  if (Array.isArray(config.choices) && config.choices.length > 0) {
    const isAllowed = config.choices.some((choice) => String(choice) === strValue);
    if (!isAllowed) {
      return {
        valid: false,
        type: 'invalid_choice',
        error: `${name} must be one of: ${config.choices.join(', ')}`
      };
    }
  }

  // 6. Regular Expression / Pattern
  if (config.regex || config.pattern) {
    const pattern = config.regex || config.pattern;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    if (!regex.test(strValue)) {
      return {
        valid: false,
        type: 'pattern_mismatch',
        error: `${name} format is invalid (failed pattern match)`
      };
    }
  }

  // 7. Custom Validation Function
  const customValidator = config.validate || config.custom;
  if (typeof customValidator === 'function') {
    try {
      const customResult = customValidator(parsedValue, allEnv);
      if (customResult === false) {
        return {
          valid: false,
          type: 'custom_validation_failed',
          error: `${name} failed custom validation rule`
        };
      }
      if (typeof customResult === 'string' && customResult.length > 0) {
        return {
          valid: false,
          type: 'custom_validation_failed',
          error: customResult
        };
      }
    } catch (err) {
      return {
        valid: false,
        type: 'custom_validation_error',
        error: `${name} validation threw an error: ${err.message}`
      };
    }
  }

  return {
    valid: true,
    parsedValue
  };
}

module.exports = {
  isValidUrl,
  isValidEmail,
  isBooleanLike,
  parseBoolean,
  isValidNumber,
  validateValue
};
