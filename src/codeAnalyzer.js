const fs = require('fs').promises;
const path = require('path');

class CodeAnalyzer {
  constructor(config) {
    this.config = config;
    this.fileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.php'];
  }

  async scanCode(repoPath, config) {
    const issues = [];
    const filesScanned = [];
    
    await this.scanDirectory(repoPath, repoPath, issues, filesScanned);
    
    return {
      timestamp: new Date().toISOString(),
      repoPath,
      filesScanned: filesScanned.length,
      files: filesScanned,
      issues,
      summary: this.generateSummary(issues)
    };
  }

  async scanDirectory(dirPath, basePath, issues, filesScanned) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        // Skip node_modules, .git, and other common directories
        if (this.shouldSkip(entry.name, relativePath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, basePath, issues, filesScanned);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.fileExtensions.includes(ext)) {
            filesScanned.push(relativePath);
            await this.scanFile(fullPath, relativePath, issues);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  shouldSkip(name, relativePath) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor'];
    const skipPatterns = ['cloned-repos', 'audit-reports', 'temp'];
    
    return skipDirs.includes(name) || 
           skipPatterns.some(pattern => relativePath.includes(pattern));
  }

  async scanFile(filePath, relativePath, issues) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      if (this.config.scan.checkSecurityIssues) {
        this.checkSecurityIssues(content, lines, relativePath, issues);
      }
      
      if (this.config.scan.checkCodeQuality) {
        this.checkCodeQuality(content, lines, relativePath, issues);
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  checkSecurityIssues(content, lines, filePath, issues) {
    // Check for hardcoded secrets (basic patterns)
    const secretPatterns = [
      { pattern: /password\s*=\s*['"][^'"]+['"]/gi, message: 'Potential hardcoded password' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, message: 'Potential hardcoded API key' },
      { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, message: 'Potential hardcoded secret' },
      { pattern: /token\s*=\s*['"][^'"]+['"]/gi, message: 'Potential hardcoded token' },
    ];
    
    secretPatterns.forEach(({ pattern, message }) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'security',
          severity: 'high',
          rule: 'no-hardcoded-secrets',
          message,
          file: filePath,
          line: lineNumber,
          code: lines[lineNumber - 1]?.trim()
        });
      }
    });
    
    // Check for eval usage
    if (/\beval\s*\(/.test(content)) {
      const matches = content.matchAll(/\beval\s*\(/g);
      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'security',
          severity: 'high',
          rule: 'no-eval',
          message: 'Use of eval() is dangerous and should be avoided',
          file: filePath,
          line: lineNumber,
          code: lines[lineNumber - 1]?.trim()
        });
      }
    }
  }

  checkCodeQuality(content, lines, filePath, issues) {
    // Check for console.log in production code
    const consoleMatches = content.matchAll(/console\.(log|warn|error|info)/g);
    for (const match of consoleMatches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'quality',
        severity: 'low',
        rule: 'no-console-log',
        message: 'Console statement found - consider using a logger',
        file: filePath,
        line: lineNumber,
        code: lines[lineNumber - 1]?.trim()
      });
    }
    
    // Check for TODO/FIXME comments
    const todoMatches = content.matchAll(/\/\/\s*(TODO|FIXME)[\s:]/gi);
    for (const match of todoMatches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'quality',
        severity: 'info',
        rule: 'todo-comment',
        message: `${match[1]} comment found`,
        file: filePath,
        line: lineNumber,
        code: lines[lineNumber - 1]?.trim()
      });
    }
  }

  generateSummary(issues) {
    const summary = {
      total: issues.length,
      bySeverity: {
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        info: issues.filter(i => i.severity === 'info').length
      },
      byType: {
        security: issues.filter(i => i.type === 'security').length,
        quality: issues.filter(i => i.type === 'quality').length,
        dependency: issues.filter(i => i.type === 'dependency').length
      }
    };
    
    return summary;
  }
}

async function scanCode(repoPath, config) {
  const analyzer = new CodeAnalyzer(config);
  return await analyzer.scanCode(repoPath, config);
}

module.exports = { CodeAnalyzer, scanCode };
