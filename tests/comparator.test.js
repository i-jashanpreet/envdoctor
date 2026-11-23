'use strict';

const path = require('path');
const fs = require('fs');
const { compareEnv, compareEnvObjects, compareEnvFiles } = require('../src/comparator');

describe('comparator', () => {
  describe('compareEnvObjects', () => {
    test('identifies matching, missing, extra, and empty variables', () => {
      const exampleObj = {
        PORT: '3000',
        DATABASE_URL: '',
        API_KEY: '',
        ADMIN_EMAIL: ''
      };

      const actualEnv = {
        PORT: '8080',
        DATABASE_URL: 'postgres://localhost:5432/db',
        API_KEY: '', // empty in .env
        DEV_FLAG: 'active' // extra in .env, not in example
        // ADMIN_EMAIL is missing in .env
      };

      const result = compareEnvObjects(actualEnv, exampleObj);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['ADMIN_EMAIL']);
      expect(result.empty).toEqual(['API_KEY']);
      expect(result.extra).toEqual(['DEV_FLAG']);
      expect(result.present).toEqual(['PORT', 'DATABASE_URL']);

      expect(result.summary.missingCount).toBe(1);
      expect(result.summary.emptyCount).toBe(1);
      expect(result.summary.extraCount).toBe(1);
      expect(result.summary.presentCount).toBe(2);
    });

    test('returns valid: true when all example variables are satisfied', () => {
      const exampleObj = {
        PORT: '3000',
        DATABASE_URL: ''
      };

      const actualEnv = {
        PORT: '8080',
        DATABASE_URL: 'postgres://localhost:5432/db'
      };

      const result = compareEnvObjects(actualEnv, exampleObj);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.empty).toHaveLength(0);
    });

    test('never exposes secret values in comparison results', () => {
      const secretKey = 'super_secret_production_password_xyz';
      const result = compareEnvObjects(
        { SECRET_KEY: secretKey },
        { SECRET_KEY: '' }
      );

      const jsonStr = JSON.stringify(result);
      expect(jsonStr).not.toContain(secretKey);
    });
  });

  describe('compareEnvFiles', () => {
    const tempEnvPath = path.resolve(__dirname, 'test.env');
    const tempExamplePath = path.resolve(__dirname, 'test.env.example');

    beforeEach(() => {
      fs.writeFileSync(tempExamplePath, 'PORT=3000\nDATABASE_URL=\nAPI_KEY=\n');
      fs.writeFileSync(tempEnvPath, 'PORT=8080\nDATABASE_URL=postgres://localhost/db\n');
    });

    afterEach(() => {
      if (fs.existsSync(tempEnvPath)) fs.unlinkSync(tempEnvPath);
      if (fs.existsSync(tempExamplePath)) fs.unlinkSync(tempExamplePath);
    });

    test('compares files from disk correctly', () => {
      const result = compareEnvFiles(tempEnvPath, tempExamplePath);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['API_KEY']);
      expect(result.present).toEqual(['PORT', 'DATABASE_URL']);
    });

    test('throws if example template file does not exist', () => {
      expect(() => {
        compareEnvFiles(tempEnvPath, 'non_existent_example.env');
      }).toThrow(/Template file not found/);
    });

    test('compareEnv wrapper supports file options and object options', () => {
      const fileRes = compareEnv({
        envPath: tempEnvPath,
        examplePath: tempExamplePath
      });
      expect(fileRes.missing).toEqual(['API_KEY']);

      const objRes = compareEnv({
        env: { PORT: '3000' },
        example: { PORT: '3000' }
      });
      expect(objRes.valid).toBe(true);
    });
  });
});
