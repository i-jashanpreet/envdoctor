'use strict';

const {
  formatCheckReport,
  formatComparisonReport,
  printCheckReport,
  printComparisonReport,
  createColorMap,
  shouldColorize
} = require('../src/reporter');

describe('reporter', () => {
  describe('formatCheckReport', () => {
    test('formats successful check report according to specification', () => {
      const mockResult = {
        valid: true,
        errors: [],
        results: {
          PORT: { valid: true, status: 'VALID' },
          DATABASE_URL: { valid: true, status: 'VALID' },
          API_KEY: { valid: true, status: 'VALID' }
        },
        summary: { total: 3, passed: 3, failed: 0 }
      };

      const output = formatCheckReport(mockResult, { noColor: true });

      expect(output).toContain('ENVDOCTOR REPORT');
      expect(output).toContain('✓ PORT');
      expect(output).toContain('VALID');
      expect(output).toContain('✓ DATABASE_URL');
      expect(output).toContain('✓ API_KEY');
      expect(output).toContain('All environment variables are configured!');
    });

    test('formats failure check report according to specification', () => {
      const mockResult = {
        valid: false,
        errors: [
          { variable: 'DATABASE_URL', type: 'missing', message: 'DATABASE_URL is required but missing' },
          { variable: 'API_KEY', type: 'missing', message: 'API_KEY is required but missing' }
        ],
        results: {
          PORT: { valid: true, status: 'VALID' },
          DATABASE_URL: { valid: false, status: 'MISSING' },
          API_KEY: { valid: false, status: 'MISSING' }
        },
        summary: { total: 3, passed: 1, failed: 2 }
      };

      const output = formatCheckReport(mockResult, { noColor: true, verbose: true });

      expect(output).toContain('ENVDOCTOR REPORT');
      expect(output).toContain('✓ PORT');
      expect(output).toContain('✗ DATABASE_URL');
      expect(output).toContain('MISSING');
      expect(output).toContain('✗ API_KEY');
      expect(output).toContain('2 configuration issues found!');
      expect(output).toContain('Please check your .env file.');
      expect(output).toContain('Issue Details:');
    });

    test('handles empty results gracefully', () => {
      const output = formatCheckReport({ valid: true, results: {} }, { noColor: true });
      expect(output).toContain('No environment variables were checked.');
    });
  });

  describe('formatComparisonReport', () => {
    test('formats valid comparison report', () => {
      const comparison = {
        valid: true,
        present: ['PORT', 'DATABASE_URL'],
        missing: [],
        empty: [],
        extra: []
      };

      const output = formatComparisonReport(comparison, { noColor: true });
      expect(output).toContain('ENVDOCTOR TEMPLATE AUDIT');
      expect(output).toContain('✓ PORT');
      expect(output).toContain('All template variables are satisfied in .env!');
    });

    test('formats invalid comparison report with missing and empty variables', () => {
      const comparison = {
        valid: false,
        present: ['PORT'],
        missing: ['DATABASE_URL', 'API_KEY'],
        empty: ['DEBUG'],
        extra: ['UNTRACKED_KEY']
      };

      const output = formatComparisonReport(comparison, { noColor: true });
      expect(output).toContain('ENVDOCTOR TEMPLATE AUDIT');
      expect(output).toContain('✗ DATABASE_URL');
      expect(output).toContain('MISSING');
      expect(output).toContain('✗ DEBUG');
      expect(output).toContain('EMPTY');
      expect(output).toContain('! UNTRACKED_KEY');
      expect(output).toContain('3 template issues found!');
      expect(output).toContain('Please sync your .env with .env.example.');
    });
  });

  describe('colors and stream output', () => {
    test('createColorMap wraps text with ANSI codes when enabled', () => {
      const c = createColorMap(true);
      expect(c.green('test')).toContain('\x1b[32mtest\x1b[0m');
      expect(c.red('fail')).toContain('\x1b[31mfail\x1b[0m');
    });

    test('createColorMap returns plain text when disabled', () => {
      const c = createColorMap(false);
      expect(c.green('test')).toBe('test');
    });

    test('shouldColorize respects options', () => {
      expect(shouldColorize({ color: true })).toBe(true);
      expect(shouldColorize({ color: false })).toBe(false);
      expect(shouldColorize({ noColor: true })).toBe(false);
    });

    test('printCheckReport and printComparisonReport write to process streams without throwing', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

      try {
        printCheckReport({ valid: true, results: { PORT: { valid: true } } }, { noColor: true });
        expect(stdoutSpy).toHaveBeenCalled();

        printCheckReport({ valid: false, results: { PORT: { valid: false } } }, { noColor: true });
        expect(stderrSpy).toHaveBeenCalled();

        printComparisonReport({ valid: true, present: ['PORT'] }, { noColor: true });
        expect(stdoutSpy).toHaveBeenCalled();

        printComparisonReport({ valid: false, present: [], missing: ['KEY'], empty: [], extra: [] }, { noColor: true });
        expect(stderrSpy).toHaveBeenCalled();
      } finally {
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
      }
    });
  });
});
