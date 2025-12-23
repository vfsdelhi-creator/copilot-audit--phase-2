const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { scanCode } = require('./codeAnalyzer');

class CodeScanner {
  constructor(config) {
    this.config = config;
    this.cloneDir = config.scan.cloneDir;
    this.outputDir = config.scan.outputDir;
  }

  async initialize() {
    // Create necessary directories
    await this.ensureDirectory(this.cloneDir);
    await this.ensureDirectory(this.outputDir);
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async cloneRepository(repoUrl, repoName) {
    console.log(`Cloning repository: ${repoUrl}`);
    const targetPath = path.join(this.cloneDir, repoName);
    
    try {
      // Check if directory already exists
      try {
        await fs.access(targetPath);
        console.log(`Repository already cloned at ${targetPath}, pulling latest changes...`);
        const git = simpleGit(targetPath);
        await git.pull();
      } catch {
        // Clone if doesn't exist
        const git = simpleGit();
        await git.clone(repoUrl, targetPath);
        console.log(`Repository cloned successfully to ${targetPath}`);
      }
      return targetPath;
    } catch (error) {
      console.error(`Error cloning repository: ${error.message}`);
      throw error;
    }
  }

  async scanRepository(repoPath, repoName) {
    console.log(`\nScanning repository: ${repoName}`);
    console.log(`Path: ${repoPath}`);
    
    const scanResults = await scanCode(repoPath, this.config);
    
    // Save scan results
    const reportPath = path.join(this.outputDir, `${repoName}-scan-report.json`);
    await fs.writeFile(reportPath, JSON.stringify(scanResults, null, 2));
    console.log(`Scan report saved to: ${reportPath}`);
    
    return scanResults;
  }

  async pullAndScan(repositories) {
    await this.initialize();
    
    const results = [];
    
    for (const repo of repositories) {
      try {
        const repoName = repo.name || this.extractRepoName(repo.url);
        const repoPath = await this.cloneRepository(repo.url, repoName);
        const scanResult = await this.scanRepository(repoPath, repoName);
        
        results.push({
          repository: repoName,
          url: repo.url,
          status: 'success',
          scanResult
        });
      } catch (error) {
        results.push({
          repository: repo.name || repo.url,
          url: repo.url,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Save overall results
    const summaryPath = path.join(this.outputDir, 'scan-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
    console.log(`\n=== Scan Summary ===`);
    console.log(`Total repositories scanned: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);
    console.log(`Summary saved to: ${summaryPath}`);
    
    return results;
  }

  extractRepoName(url) {
    const match = url.match(/\/([^\/]+?)(\.git)?$/);
    return match ? match[1] : 'unknown-repo';
  }
}

async function main() {
  const config = require('../config.json');
  const scanner = new CodeScanner(config);
  
  // Example: Scan current directory
  const currentDir = process.cwd();
  console.log('=== Code Scanner ===');
  console.log('Scanning current repository...\n');
  
  try {
    const scanResult = await scanCode(currentDir, config);
    const reportPath = path.join(config.scan.outputDir, 'current-repo-scan.json');
    await scanner.ensureDirectory(config.scan.outputDir);
    await fs.writeFile(reportPath, JSON.stringify(scanResult, null, 2));
    
    console.log('\n=== Scan Complete ===');
    console.log(`Report saved to: ${reportPath}`);
    console.log(`\nSummary:`);
    console.log(`- Files scanned: ${scanResult.filesScanned}`);
    console.log(`- Issues found: ${scanResult.issues.length}`);
    console.log(`- Security issues: ${scanResult.issues.filter(i => i.type === 'security').length}`);
    console.log(`- Code quality issues: ${scanResult.issues.filter(i => i.type === 'quality').length}`);
  } catch (error) {
    console.error('Scan failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CodeScanner };
