# 🩺 EnvDoctor

> A lightweight, zero-runtime-dependency environment variable health checker for Node.js.  
> Detect missing configuration, invalid environment variables, exposed configuration mistakes, and `.env.example` mismatches before your application starts.

[![npm version](https://img.shields.io/npm/v/@i_jashan/envdoctor.svg)](https://www.npmjs.com/package/@i_jashan/envdoctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-58%20passed-brightgreen.svg)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)]()

---

## 📦 Installation

Install EnvDoctor in your Node.js project:

```bash
npm install @i_jashan/envdoctor
```

Alternatively, use Yarn or pnpm:

```bash
yarn add @i_jashan/envdoctor
```

```bash
pnpm add @i_jashan/envdoctor
```

Run directly using NPX without manually installing it:

```bash
npx @i_jashan/envdoctor
```

**npm Package:** [@i_jashan/envdoctor](https://www.npmjs.com/package/@i_jashan/envdoctor)

---

## 📌 Problem Statement

In modern Node.js applications, missing or invalid environment variables are common causes of runtime crashes, silent misconfigurations, and broken deployments.

**Examples:**
- A typo in `DATABASE_URL` leads to database connection errors.
- An empty `API_KEY` causes third-party API requests to fail.
- A missing `PORT` variable creates unexpected application behavior.
- Differences between `.env` and `.env.example` leave new developers struggling with configuration.

EnvDoctor solves these problems by auditing environment variables before an application starts.

It provides a reusable JavaScript API, a command-line interface, zero runtime dependencies, and secure reports that never expose sensitive environment variable values.

---

## ✨ Features

- ⚡ **Zero Runtime Dependencies**: Built using Node.js built-in modules.
- 🔍 **Missing & Empty Detection**: Identifies undefined, missing, and blank variables.
- 🔒 **Secret Protection**: Prevents sensitive environment values from appearing in reports.
- 📐 **Data Type Validation**: Supports `string`, `number`, `boolean`, `url`, `email`, and `port`.
- 🎛️ **Custom Constraints**: Supports minimum/maximum values, length limits, choices, regex patterns, and custom validators.
- 🔄 **Template Auditing**: Compares `.env` against `.env.example`.
- 💻 **CLI Support**: Run EnvDoctor directly from your terminal.
- 🎨 **Terminal Reports**: Clear, colorized reports with readable status indicators.
- 🧪 **CI/CD Ready**: Returns appropriate exit codes for automated pipelines.
- 📦 **Lightweight**: Approximately 14.8 KB compressed package size.

---

## 🚀 Quick Start

### 1. Basic Variable Existence Check

```javascript
const { checkEnv } = require('@i_jashan/envdoctor');

const result = checkEnv({
  required: ['PORT', 'DATABASE_URL', 'API_KEY']
});

if (!result.valid) {
  console.error('Environment check failed!');
  process.exit(1);
}

console.log('Environment is healthy!');
```

### 2. Automatically Throw Errors

Use `throwOnError` to stop execution when environment validation fails.

```javascript
const { checkEnv } = require('@i_jashan/envdoctor');

checkEnv({
  required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
  throwOnError: true
});

console.log('Environment is valid!');
```

---

## 📖 API Documentation

### `checkEnv(config, [customEnv])`

Validates environment variables against a given configuration.

#### Parameters

| Parameter | Description |
| :--- | :--- |
| `required` | Array of required variable names |
| `variables` | Object containing detailed validation rules |
| `env` | Custom environment object; defaults to `process.env` |
| `allowEmpty` | Allows empty strings when enabled |
| `throwOnError` | Throws an error when validation fails |
| `customEnv` | Optional custom environment dictionary |

#### Example:

```javascript
const { checkEnv } = require('@i_jashan/envdoctor');

const result = checkEnv({
  required: ['PORT', 'DATABASE_URL']
});

console.log(result);
```

#### Return Value

Returns a validation result containing:

```javascript
{
  valid: true,
  errors: [],
  warnings: [],
  results: {},
  summary: {
    total: 2,
    passed: 2,
    failed: 0,
    warnings: 0
  }
}
```

---

## 🎛️ Schema & Validation Types

EnvDoctor supports detailed validation rules for environment variables.

```javascript
const { checkEnv } = require('@i_jashan/envdoctor');

const result = checkEnv({
  variables: {
    PORT: {
      required: true,
      type: 'number',
      min: 1024,
      max: 65535
    },
    DATABASE_URL: {
      required: true,
      type: 'url'
    },
    ADMIN_EMAIL: {
      required: true,
      type: 'email'
    },
    NODE_ENV: {
      required: true,
      choices: ['development', 'test', 'staging', 'production']
    },
    DEBUG: {
      required: false,
      type: 'boolean',
      default: false
    },
    API_KEY: {
      required: true,
      regex: /^sk_[a-zA-Z0-9]{24}$/
    },
    SESSION_SECRET: {
      required: true,
      validate: (value) => {
        if (value.length < 32) {
          return 'SESSION_SECRET must be at least 32 characters long';
        }
        return true;
      }
    }
  }
});

console.log(result);
```

### Supported Data Types

| Type | Description |
| :--- | :--- |
| `string` | String validation with length and pattern constraints |
| `number` | Numeric validation with minimum and maximum values |
| `port` | Integer validation between 1 and 65535 |
| `boolean` | Accepts `true`, `false`, `1`, `0`, `yes`, and `no` |
| `url` | Validates web and database URLs |
| `email` | Validates email address formatting |

**Additional constraints:**
- `min` and `max`
- `minLength` and `maxLength`
- `regex` and `pattern`
- `choices` for allowed values
- `validate` for custom validation functions

---

## 🖥️ CLI Usage

EnvDoctor includes a command-line utility for checking environment configurations without writing JavaScript code.

Run:

```bash
npx @i_jashan/envdoctor
```

### Command Options

| Option | Description |
| :--- | :--- |
| `-e, --env` | Path to the .env file |
| `-t, --example` | Path to .env.example |
| `-c, --config` | Path to custom configuration |
| `--strict` | Fail if extra untracked variables exist |
| `--no-color` | Disable colored output |
| `-s, --silent` | Suppress terminal output |
| `-v, --version` | Display package version |
| `-h, --help` | Display help documentation |

### Examples

Check standard environment files:

```bash
npx @i_jashan/envdoctor
```

Check specific environment files:

```bash
npx @i_jashan/envdoctor --env .env.staging --example .env.template
```

Enable strict mode:

```bash
npx @i_jashan/envdoctor --strict
```

### Exit Codes

| Code | Meaning |
| :--- | :--- |
| `0` | All environment variables are valid |
| `1` | One or more configuration errors were detected |

This makes EnvDoctor suitable for CI/CD pipelines and automated deployment checks.

---

## 📊 Terminal Reports

### Successful Validation

```text
================================ ENVDOCTOR REPORT ================================
✓ PORT              VALID
✓ DATABASE_URL      VALID
✓ API_KEY           VALID

All environment variables are configured!
==================================================================================
```

### Failed Validation

```text
================================ ENVDOCTOR REPORT ================================
✓ PORT              VALID
✗ DATABASE_URL      MISSING
✗ API_KEY           MISSING

2 configuration issues found! Please check your .env file.
==================================================================================
```

---

## 🔄 .env.example Comparison

EnvDoctor can compare your actual `.env` file against your team's `.env.example` template.

```javascript
const { compareEnv } = require('@i_jashan/envdoctor');

const comparison = compareEnv({
  envPath: '.env',
  examplePath: '.env.example'
});

console.log('Missing in .env:', comparison.missing);
console.log('Extra variables:', comparison.extra);
console.log('Empty variables:', comparison.empty);
console.log('Status:', comparison.valid ? 'OK' : 'MISMATCH');
```

This helps developers maintain consistent environment configurations across development and production environments.

---

## 🧩 Optional Configuration File

You can define environment validation rules in an `envdoctor.config.js` file.

```javascript
// envdoctor.config.js
module.exports = {
  variables: {
    PORT: { required: true, type: 'port', default: 3000 },
    DATABASE_URL: { required: true, type: 'url' },
    REDIS_HOST: { required: false, type: 'string' },
    NODE_ENV: { required: true, choices: ['development', 'production', 'test'] }
  }
};
```

When this configuration file is present, EnvDoctor can use it to validate your environment through the CLI.

---

## 🧪 Testing

EnvDoctor includes automated unit and integration tests.

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Test Results

| Metric | Result |
| :--- | :--- |
| Test Suites | 6 passed |
| Total Tests | 58 passed |
| Statement Coverage | 86.35% |
| Runtime Dependencies | 0 |

---

## 🔒 Security Best Practices

- Never commit `.env` files to GitHub.
- Keep `.env` inside `.gitignore`.
- Never expose API keys, passwords, or database credentials.
- Use `.env.example` with placeholder values.
- Keep environment configurations synchronized across development and production.

EnvDoctor is designed to avoid exposing actual environment variable values in its reports.

---

## 🏗️ Project Architecture

```text
envdoctor/
│
├── bin/
│   └── envdoctor
│
├── src/
│   ├── index.js
│   ├── checker.js
│   ├── validator.js
│   ├── envParser.js
│   ├── comparator.js
│   ├── reporter.js
│   └── cli.js
│
├── tests/
│   ├── checker.test.js
│   ├── validator.test.js
│   ├── comparator.test.js
│   ├── parser.test.js
│   ├── reporter.test.js
│   └── cli.test.js
│
├── examples/
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: add new validation feature"
   ```
4. Run the tests:
   ```bash
   npm test
   ```
5. Push your branch and submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.

---

## 📦 Links

- **npm Package**: [@i_jashan/envdoctor](https://www.npmjs.com/package/@i_jashan/envdoctor)
- **Installation**: `npm install @i_jashan/envdoctor`
- **CLI**: `npx @i_jashan/envdoctor`

---

Built with Node.js ❤️ to make environment configuration safer and easier.
