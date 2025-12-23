# Copilot Audit - Phase 2

A comprehensive code scanning and audit system for pulling, analyzing, and auditing code repositories.

## Features

- 🔍 **Code Scanning**: Automatically scan code for security vulnerabilities and quality issues
- 📊 **Audit Reports**: Generate detailed audit reports in JSON and Markdown formats
- 🔒 **Security Checks**: Detect hardcoded secrets, eval usage, and other security issues
- 📝 **Code Quality**: Identify code quality issues like console statements and TODO comments
- 🔄 **Repository Pulling**: Clone and update repositories for scanning

## Installation

```bash
npm install
```

## Usage

### Quick Start

1. **Scan the current repository:**
   ```bash
   npm run scan
   ```

2. **Generate an audit report:**
   ```bash
   npm run audit
   ```

### What Gets Scanned

The scanner analyzes:
- JavaScript/TypeScript files (.js, .ts, .jsx, .tsx)
- Python files (.py)
- Java files (.java)
- Go files (.go)
- Ruby files (.rb)
- PHP files (.php)

### Security Checks

- Hardcoded passwords, API keys, secrets, and tokens
- Use of `eval()` functions
- Other potential security vulnerabilities

### Code Quality Checks

- Console.log statements (should use proper logging)
- TODO/FIXME comments
- Code structure and patterns

## Configuration

Edit `config.json` to customize scanning behavior:

```json
{
  "scan": {
    "outputDir": "./audit-reports",
    "cloneDir": "./cloned-repos",
    "checkSecurityIssues": true,
    "checkCodeQuality": true,
    "checkDependencies": true
  },
  "audit": {
    "rules": [
      "no-hardcoded-secrets",
      "no-eval",
      "no-console-log",
      "check-dependencies-vulnerabilities"
    ],
    "severity": "high"
  }
}
```

## Output

### Scan Reports

Scan results are saved to the `audit-reports/` directory:
- `current-repo-scan.json`: Detailed scan results in JSON format
- Individual repository scan reports

### Audit Reports

After running the auditor:
- `audit-report.json`: Comprehensive audit data
- `audit-report.md`: Human-readable markdown report

### Example Report Structure

```json
{
  "timestamp": "2025-12-23T16:00:00.000Z",
  "filesScanned": 10,
  "issues": [
    {
      "type": "security",
      "severity": "high",
      "rule": "no-hardcoded-secrets",
      "message": "Potential hardcoded password",
      "file": "src/config.js",
      "line": 15,
      "code": "password = 'secret123'"
    }
  ],
  "summary": {
    "total": 5,
    "bySeverity": {
      "high": 1,
      "medium": 2,
      "low": 2
    }
  }
}
```

## Advanced Usage

### Programmatic Usage

```javascript
const { CodeScanner, CodeAuditor } = require('./src/index');
const config = require('./config.json');

// Scan a repository
const scanner = new CodeScanner(config);
const results = await scanner.pullAndScan([
  { url: 'https://github.com/user/repo.git', name: 'repo-name' }
]);

// Generate audit report
const auditor = new CodeAuditor(config);
const audit = await auditor.generateAuditReport();
```

## Project Structure

```
copilot-audit--phase-2/
├── src/
│   ├── index.js          # Main entry point
│   ├── scanner.js        # Code scanner
│   ├── auditor.js        # Audit report generator
│   └── codeAnalyzer.js   # Code analysis logic
├── config.json           # Configuration file
├── package.json          # NPM package configuration
├── audit-reports/        # Generated reports (created on first run)
└── README.md            # This file
```

## Development

### Running Tests

```bash
npm test
```

### Adding Custom Rules

To add custom scanning rules, edit `src/codeAnalyzer.js` and add your pattern matching logic to the `checkSecurityIssues` or `checkCodeQuality` methods.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
