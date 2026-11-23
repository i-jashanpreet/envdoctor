'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parses the contents of a .env file into a JavaScript object.
 * Follows standard .env rules:
 * - Skips empty lines and lines starting with '#'
 * - Supports `KEY=value`, `export KEY=value`, and `KEY="value"`
 * - Handles single quotes, double quotes, and unquoted values
 * - Supports escaped characters (\n, \r, \t) in double quotes
 * - Supports inline comments for unquoted and quoted values
 * - Handles empty values (KEY=)
 * - Trims variable names and values
 *
 * @param {string} content - Raw .env file content
 * @returns {Record<string, string>} Key-value map of environment variables
 */
function parseEnv(content) {
  if (typeof content !== 'string') {
    return {};
  }

  const result = {};
  // Normalize newline characters across OS platforms
  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    i++;

    // Ignore empty lines and comment lines
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Support 'export KEY=value'
    if (line.startsWith('export ')) {
      line = line.slice(7).trim();
    }

    // Find the first '=' delimiter
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) {
      // Line without '=' is ignored or treated as boolean/empty flag if needed; standard .env ignores
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    if (!key) {
      continue;
    }

    let val = line.slice(equalIndex + 1).trim();

    // Check if value is wrapped in quotes
    if (val.startsWith('"')) {
      // Double quoted value - may span multiple lines
      let quoteEndIndex = findClosingQuote(val, 1, '"');
      let fullVal = val;

      while (quoteEndIndex === -1 && i < lines.length) {
        // Multi-line value
        const nextLine = lines[i];
        i++;
        fullVal += '\n' + nextLine;
        quoteEndIndex = findClosingQuote(fullVal, 1, '"');
      }

      if (quoteEndIndex !== -1) {
        val = fullVal.slice(1, quoteEndIndex);
        // Process escape sequences in double-quoted strings
        val = val
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      } else {
        // Unclosed quote: strip leading quote
        val = fullVal.slice(1);
      }
    } else if (val.startsWith("'")) {
      // Single quoted value - literal string, may span multiple lines
      let quoteEndIndex = findClosingQuote(val, 1, "'");
      let fullVal = val;

      while (quoteEndIndex === -1 && i < lines.length) {
        const nextLine = lines[i];
        i++;
        fullVal += '\n' + nextLine;
        quoteEndIndex = findClosingQuote(fullVal, 1, "'");
      }

      if (quoteEndIndex !== -1) {
        val = fullVal.slice(1, quoteEndIndex);
      } else {
        val = fullVal.slice(1);
      }
    } else {
      // Unquoted value: strip trailing inline comments like ` # comment`
      const commentIndex = val.indexOf(' #');
      if (commentIndex !== -1) {
        val = val.slice(0, commentIndex).trim();
      } else if (val.startsWith('#')) {
        val = '';
      }
      val = val.trim();
    }

    result[key] = val;
  }

  return result;
}

/**
 * Helper to locate closing quote that is not escaped by backslash.
 *
 * @param {string} str
 * @param {number} startIndex
 * @param {string} quoteChar
 * @returns {number} Index of closing quote, or -1 if not found
 */
function findClosingQuote(str, startIndex, quoteChar) {
  for (let idx = startIndex; idx < str.length; idx++) {
    if (str[idx] === quoteChar) {
      // Count preceding backslashes
      let backslashes = 0;
      let b = idx - 1;
      while (b >= 0 && str[b] === '\\') {
        backslashes++;
        b--;
      }
      // If even number of backslashes, quote is not escaped
      if (backslashes % 2 === 0) {
        return idx;
      }
    }
  }
  return -1;
}

/**
 * Reads and parses a .env file from disk.
 *
 * @param {string} filePath - Absolute or relative path to .env file
 * @returns {Record<string, string>} Parsed environment variables or empty object if file not found
 */
function parseEnvFile(filePath) {
  if (!filePath) {
    return {};
  }
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    return parseEnv(content);
  } catch (err) {
    throw new Error(`Failed to read environment file at "${resolvedPath}": ${err.message}`);
  }
}

module.exports = {
  parseEnv,
  parseEnvFile
};
