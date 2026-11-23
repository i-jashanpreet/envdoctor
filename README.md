# EnvDoctor 🩺

> A lightweight, zero-dependency environment variable health checker for Node.js. Detect configuration errors, missing secrets, invalid URLs, and `.env.example` mismatches before your application starts.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/envdoctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-58%20passing-brightgreen.svg)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)]()

---

## 📌 Problem Statement

In modern Node.js applications, missing or invalid environment variables are one of the most common causes of runtime crashes, silent misconfigurations, and broken deployments:

- A typo in `DATABASE_URL` leads to unhandled database connection pool errors minutes after booting.
- An empty `API_KEY` causes third-party payment requests to fail silently in production.
- A missing `PORT` variable results in silent defaults or port conflict crashes.
- Discrepancies between local `.env` and team-shared `.env.example` leave new developers debugging for hours.

**EnvDoctor** solves this by auditing your environment before your application boots. It provides an intuitive programmatic API, a versatile CLI, zero runtime dependencies, and never exposes sensitive secrets in reports or logs.

---

## ✨ Features

- ⚡ **Zero Runtime Dependencies**: Ultra-fast, lightweight (<15 KB), secure against supply chain vulnerabilities.
- 🔍 **Missing & Empty Detection**: Catches undefined, missing, and blank environment variables instantly.
- 🛡️ **Zero Secret Leakage**: Guarantees sensitive values and API keys are never printed in console logs or error messages.
- 📐 **Data Type Validation**: Validates `string`, `number`, `boolean`, `url`, `email`, and `port`.
- 🎛️ **Custom Constraints**: Supports `min`, `max`, length limits, `choices` (enum), regex patterns, and custom validator functions.
- 🔄 **.env.example Template Auditing**: Compares `.env` against `.env.example` to ensure team synchronization.
- 💻 **Interactive CLI**: Run `npx envdoctor` anywhere with zero configuration needed.
- 🎨 **Clear Visual Reports**: Beautiful, colorized terminal reports with clean column alignment.
- 🧪 **CI/CD Ready**: Returns exit code `0` on success and `1` on failure for easy GitHub Actions / CI pipeline integration.

---

## 📦 Installation

Install as a runtime dependency or dev dependency in your project:

```bash
# Using npm
npm install envdoctor

# Using yarn
yarn add envdoctor

# Using pnpm
pnpm add envdoctor
```

Or run directly without installing via `npx`:

```bash
npx envdoctor
```

---

## 🚀 Quick Start

### 1. Basic Variable Existence Check

Ensure required keys exist before starting your server:

```javascript
const { checkEnv } = require('envdoctor');

const result = checkEnv({
  required: ['PORT', 'DATABASE_URL', 'API_KEY']
});

if (!result.valid) {
  console.error('Environment check failed!');
  process.exit(1);
}

console.log('Environment is healthy!');
```

### 2. Auto-Throw on Error

If you prefer failing fast on startup without boilerplate:

```javascript
const { checkEnv } = require('envdoctor');

// Throws an Error with formatted problem summaries if validation fails
checkEnv({
  required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
  throwOnError: true
});

// If execution reaches here, your environment is guaranteed to be valid
```

---

## 📖 API Documentation

### `checkEnv(config, [customEnv])`

Validates an environment object against the provided configuration.

#### Parameters:

- **`config`** (`Object`):
  - **`required`** (`string[]`): Array of required variable names.
  - **`variables`** (`Record<string, Rule>`): Detailed schema for each variable.
  - **`env`** (`Object`, default: `process.env`): Custom environment dictionary.
  - **`allowEmpty`** (`boolean`, default: `false`): Whether empty strings are treated as valid.
  - **`throwOnError`** (`boolean`, default: `false`): If `true`, throws an Error when invalid.
- **`customEnv`** (`Object`, optional): Alternative way to provide custom environment variables.

#### Return Value:

Returns an object with the following shape:

```javascript
{
  valid: true, // boolean
  errors: [
    {
      variable: 'DATABASE_URL',
      type: 'missing', // 'missing' | 'empty' | 'invalid_number' | 'invalid_url' | etc.
      status: 'MISSING',
      message: 'DATABASE_URL is required but missing'
    }
  ],
  warnings: [],
  results: {
    PORT: { valid: true, status: 'VALID', parsedValue: 3000 },
    DATABASE_URL: { valid: false, status: 'MISSING', error: '...' }
  },
  summary: {
    total: 2,
    passed: 1,
    failed: 1,
    warnings: 0
  }
}
```

---

## 🎛️ Schema & Validation Types

EnvDoctor provides built-in type parsers and rule validators:

```javascript
const { checkEnv, formatReport } = require('envdoctor');

const result = checkEnv({
  variables: {
    // Port validation with range boundaries
    PORT: {
      required: true,
      type: 'number',
      min: 1024,
      max: 65535
    },

    // Validates URL format (supports http, https, postgres, mongodb, redis, etc.)
    DATABASE_URL: {
      required: true,
      type: 'url'
    },

    // Validates email address format
    ADMIN_EMAIL: {
      required: true,
      type: 'email'
    },

    // Allowed choice enum
    NODE_ENV: {
      required: true,
      type: 'string',
      choices: ['development', 'test', 'staging', 'production']
    },

    // Boolean (accepts true, false, 1, 0, yes, no)
    DEBUG: {
      required: false,
      type: 'boolean',
      default: false
    },

    // Regex pattern matching
    API_KEY: {
      required: true,
      regex: /^sk_[a-zA-Z0-9]{24}$/
    },

    // Custom validation logic
    SESSION_SECRET: {
      required: true,
      validate: (value) => {
        if (value.length < 32) {
          return 'SESSION_SECRET must be at least 32 characters long for security';
        }
        return true;
      }
    }
  }
});

// Print formatted terminal report
console.log(formatReport(result));
```

### Supported Data Types:

| Type | Description | Accepted Values / Rules |
| :--- | :--- | :--- |
| `string` | UTF-8 String | Supports `minLength`, `maxLength`, `regex`, `pattern` |
| `number` | Numeric value | Parses string to float/integer. Supports `min`, `max` |
| `port` | Network port | Validates integer between `1` and `65535` |
| `boolean` | Boolean flag | Case-insensitive: `'true'`, `'false'`, `'1'`, `'0'`, `'yes'`, `'no'` |
| `url` | Web / Database URI | Valid URI structure with protocol (`https:`, `postgres:`, etc.) |
| `email` | Email address | Valid RFC-compliant email string |

---

## 🖥️ CLI Usage

EnvDoctor includes a command-line tool for auditing projects without writing code.

### Run with NPX:

```bash
npx envdoctor
```

### CLI Command Options:

```text
USAGE:
  npx envdoctor [options]

OPTIONS:
  -e, --env <path>       Path to .env file (default: .env)
  -t, --example <path>   Path to .env.example file (default: .env.example)
  -c, --config <path>    Path to custom configuration file
  --strict               Strict mode: fail if extra untracked variables exist
  --no-color             Disable colored terminal output
  -s, --silent           Suppress all output (returns exit code only)
  -v, --version          Show version number
  -h, --help             Show help documentation
```

### Examples:

```bash
# Check standard .env against .env.example
npx envdoctor

# Check specific environment files
npx envdoctor --env .env.staging --example .env.example

# Strict mode for CI/CD pipelines
npx envdoctor --strict
```

### Exit Codes:

- `0`: All variables are configured and valid.
- `1`: One or more required variables are missing, empty, or invalid.

---

## 📊 Terminal Reports

### Successful Report:

```text
================================
       ENVDOCTOR REPORT        
================================

✓ PORT              VALID
✓ DATABASE_URL      VALID
✓ API_KEY           VALID

All environment variables are configured!

================================
```

### Failure Report:

```text
================================
       ENVDOCTOR REPORT        
================================

✓ PORT              VALID
✗ DATABASE_URL      MISSING
✗ API_KEY           MISSING

2 configuration issues found!

Please check your .env file.
================================
```

---

## 🔄 `.env.example` Comparison

EnvDoctor can compare your active `.env` file directly with your team's `.env.example` template:

```javascript
const { compareEnv } = require('envdoctor');

// Compare disk files:
const comparison = compareEnv({
  envPath: '.env',
  examplePath: '.env.example'
});

console.log('Missing in .env:', comparison.missing);
console.log('Extra/Untracked:', comparison.extra);
console.log('Empty in .env:', comparison.empty);
console.log('Status:', comparison.valid ? 'OK' : 'MISMATCH');
```

---

## 🧩 Optional Configuration File

You can store your project's environment rules in an `envdoctor.config.js` file at the root of your project:

```javascript
// envdoctor.config.js
module.exports = {
  variables: {
    PORT: { required: true, type: 'port', default: 3000 },
    DATABASE_URL: { required: true, type: 'url' },
    REDIS_HOST: { required: false, type: 'string' },
    NODE_ENV: {
      required: true,
      choices: ['development', 'production', 'test']
    }
  }
};
```

When this file exists, simply running `npx envdoctor` automatically validates against it.

---

## 🧪 Testing

EnvDoctor is thoroughly covered with automated unit and integration tests.

Run the test suite:

```bash
npm test
```

Run tests with code coverage:

```bash
npm run test:coverage
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files**: Ensure `.env` is listed in `.gitignore`.
2. **Never expose secret values**: EnvDoctor masks and prevents values from appearing in reports, CLI outputs, or serialized error messages.
3. **Commit `.env.example`**: Keep dummy template keys up to date so new contributors and CI runners know what to provide.

---

## 🤝 Contributing

Contributions are warmly welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-new-feature`.
3. Commit your changes: `git commit -am 'Add new validation feature'`.
4. Run tests: `npm test`.
5. Push to the branch: `git push origin feature/my-new-feature`.
6. Submit a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
