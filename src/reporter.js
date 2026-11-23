'use strict';

/**
 * ANSI Escape Codes for formatting terminal text.
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

/**
 * Checks whether colored output should be enabled.
 * Respects NO_COLOR, FORCE_COLOR, and TTY streams.
 *
 * @param {object} [options={}]
 * @returns {boolean}
 */
function shouldColorize(options = {}) {
  if (options.color === false || options.noColor === true) {
    return false;
  }
  if (options.color === true || process.env.FORCE_COLOR) {
    return true;
  }
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  // In TTY environments, enable colors by default
  return Boolean(process.stdout && process.stdout.isTTY);
}

/**
 * Creates color helper functions that apply ANSI codes only when enabled.
 *
 * @param {boolean} enabled
 */
function createColorMap(enabled) {
  const wrap = (code) => (text) => (enabled ? `${code}${text}${ANSI.reset}` : String(text));
  return {
    bold: wrap(ANSI.bold),
    dim: wrap(ANSI.dim),
    red: wrap(ANSI.red),
    green: wrap(ANSI.green),
    yellow: wrap(ANSI.yellow),
    blue: wrap(ANSI.blue),
    cyan: wrap(ANSI.cyan),
    white: wrap(ANSI.white),
    gray: wrap(ANSI.gray)
  };
}

/**
 * Formats checkEnv results into a professional terminal report.
 *
 * Example:
 * ================================
 *        ENVDOCTOR REPORT
 * ================================
 *
 * ✓ PORT              VALID
 * ✗ DATABASE_URL      MISSING
 * ✗ API_KEY           MISSING
 *
 * 2 configuration issues found!
 *
 * Please check your .env file.
 * ================================
 *
 * @param {object} result - Output from checkEnv()
 * @param {object} [options={}] - Formatting options
 * @returns {string} Formatted text
 */
function formatCheckReport(result, options = {}) {
  const colorEnabled = shouldColorize(options);
  const c = createColorMap(colorEnabled);

  const lines = [];
  const divider = '================================';

  lines.push(c.cyan(divider));
  lines.push(c.bold(c.cyan('       ENVDOCTOR REPORT        ')));
  lines.push(c.cyan(divider));
  lines.push('');

  const entries = Object.entries(result.results || {});
  if (entries.length === 0) {
    lines.push(c.yellow('No environment variables were checked.'));
  } else {
    // Find maximum length of variable names for aligned columns
    const maxLen = Math.max(16, ...entries.map(([name]) => name.length + 2));

    for (const [name, info] of entries) {
      const paddedName = name.padEnd(maxLen, ' ');
      if (info.valid) {
        lines.push(`${c.green('✓')} ${paddedName}${c.green('VALID')}`);
      } else {
        const statusLabel = info.status || 'INVALID';
        lines.push(`${c.red('✗')} ${paddedName}${c.red(statusLabel)}`);
      }
    }
  }

  lines.push('');

  if (result.valid) {
    lines.push(c.bold(c.green('All environment variables are configured!')));
  } else {
    const errorCount = result.errors ? result.errors.length : 1;
    const issueWord = errorCount === 1 ? 'issue' : 'issues';
    lines.push(c.bold(c.red(`${errorCount} configuration ${issueWord} found!`)));
    lines.push('');
    lines.push(c.yellow('Please check your .env file.'));

    // Optional detailed reasons if errors exist and detailed output is desired
    if (options.verbose && result.errors && result.errors.length > 0) {
      lines.push('');
      lines.push(c.bold('Issue Details:'));
      for (const err of result.errors) {
        lines.push(`  • ${c.red(err.variable)}: ${err.message}`);
      }
    }
  }

  lines.push(c.cyan(divider));

  return lines.join('\n');
}

/**
 * Formats a comparison between .env and .env.example into a terminal report.
 * Never exposes actual variable values.
 *
 * @param {object} comparison - Output from compareEnv()
 * @param {object} [options={}] - Formatting options
 * @returns {string} Formatted text
 */
function formatComparisonReport(comparison, options = {}) {
  const colorEnabled = shouldColorize(options);
  const c = createColorMap(colorEnabled);

  const lines = [];
  const divider = '================================';

  lines.push(c.cyan(divider));
  lines.push(c.bold(c.cyan('   ENVDOCTOR TEMPLATE AUDIT    ')));
  lines.push(c.cyan(divider));
  lines.push('');

  const { missing = [], empty = [], extra = [], present = [] } = comparison;

  // Build combined list of template variables
  const allTemplateVars = [...present, ...missing];
  const maxLen = Math.max(16, ...[...allTemplateVars, ...extra].map((n) => n.length + 2));

  // 1. Template variables status
  for (const name of present) {
    const paddedName = name.padEnd(maxLen, ' ');
    lines.push(`${c.green('✓')} ${paddedName}${c.green('VALID')}`);
  }

  for (const name of empty) {
    const paddedName = name.padEnd(maxLen, ' ');
    lines.push(`${c.red('✗')} ${paddedName}${c.red('EMPTY')}`);
  }

  for (const name of missing) {
    const paddedName = name.padEnd(maxLen, ' ');
    lines.push(`${c.red('✗')} ${paddedName}${c.red('MISSING')}`);
  }

  // 2. Extra variables (in .env but not in .env.example)
  if (extra.length > 0) {
    for (const name of extra) {
      const paddedName = name.padEnd(maxLen, ' ');
      lines.push(`${c.yellow('!')} ${paddedName}${c.yellow('EXTRA (NOT IN TEMPLATE)')}`);
    }
  }

  lines.push('');

  if (comparison.valid) {
    lines.push(c.bold(c.green('All template variables are satisfied in .env!')));
  } else {
    const totalIssues = missing.length + empty.length;
    const issueWord = totalIssues === 1 ? 'issue' : 'issues';
    lines.push(c.bold(c.red(`${totalIssues} template ${issueWord} found!`)));
    if (missing.length > 0) {
      lines.push(c.red(`  • Missing in .env: ${missing.join(', ')}`));
    }
    if (empty.length > 0) {
      lines.push(c.red(`  • Empty in .env: ${empty.join(', ')}`));
    }
    lines.push('');
    lines.push(c.yellow('Please sync your .env with .env.example.'));
  }

  if (extra.length > 0) {
    lines.push('');
    lines.push(c.dim(`Note: ${extra.length} variable(s) found in .env that are not listed in .env.example.`));
  }

  lines.push(c.cyan(divider));

  return lines.join('\n');
}

/**
 * Prints checkEnv report directly to stdout/stderr.
 *
 * @param {object} result
 * @param {object} [options={}]
 */
function printCheckReport(result, options = {}) {
  const output = formatCheckReport(result, options);
  if (result.valid) {
    process.stdout.write(output + '\n');
  } else {
    process.stderr.write(output + '\n');
  }
}

/**
 * Prints comparison report directly to stdout/stderr.
 *
 * @param {object} comparison
 * @param {object} [options={}]
 */
function printComparisonReport(comparison, options = {}) {
  const output = formatComparisonReport(comparison, options);
  if (comparison.valid) {
    process.stdout.write(output + '\n');
  } else {
    process.stderr.write(output + '\n');
  }
}

module.exports = {
  formatCheckReport,
  formatComparisonReport,
  printCheckReport,
  printComparisonReport,
  createColorMap,
  shouldColorize
};
