const fs = require('fs').promises;
const path = require('path');

class CodeAuditor {
  constructor(config) {
    this.config = config;
    this.outputDir = config.scan.outputDir;
  }

  async generateAuditReport() {
    console.log('=== Code Auditor ===');
    console.log('Generating audit report...\n');
    
    try {
      // Read all scan reports
      const reportFiles = await this.findScanReports();
      
      if (reportFiles.length === 0) {
        console.log('No scan reports found. Please run the scanner first.');
        return;
      }
      
      const auditData = await this.aggregateReports(reportFiles);
      const auditReport = this.createAuditReport(auditData);
      
      // Save audit report
      const reportPath = path.join(this.outputDir, 'audit-report.json');
      await fs.writeFile(reportPath, JSON.stringify(auditReport, null, 2));
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(auditReport);
      const mdPath = path.join(this.outputDir, 'audit-report.md');
      await fs.writeFile(mdPath, markdownReport);
      
      console.log('=== Audit Complete ===');
      console.log(`JSON Report: ${reportPath}`);
      console.log(`Markdown Report: ${mdPath}`);
      console.log('\n=== Summary ===');
      console.log(`Total files audited: ${auditReport.totalFiles}`);
      console.log(`Total issues: ${auditReport.totalIssues}`);
      console.log(`High severity: ${auditReport.summary.bySeverity.high}`);
      console.log(`Medium severity: ${auditReport.summary.bySeverity.medium}`);
      console.log(`Low severity: ${auditReport.summary.bySeverity.low}`);
      
      return auditReport;
    } catch (error) {
      console.error('Audit failed:', error.message);
      throw error;
    }
  }

  async findScanReports() {
    try {
      await fs.access(this.outputDir);
    } catch {
      return [];
    }
    
    const files = await fs.readdir(this.outputDir);
    return files.filter(f => f.endsWith('-scan.json') || f.endsWith('-report.json'));
  }

  async aggregateReports(reportFiles) {
    const reports = [];
    
    for (const file of reportFiles) {
      try {
        const filePath = path.join(this.outputDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        reports.push({ file, data });
      } catch (error) {
        console.warn(`Failed to read report ${file}:`, error.message);
      }
    }
    
    return reports;
  }

  createAuditReport(auditData) {
    const allIssues = [];
    let totalFiles = 0;
    
    auditData.forEach(({ file, data }) => {
      if (data.issues) {
        allIssues.push(...data.issues.map(issue => ({
          ...issue,
          source: file
        })));
      }
      if (data.filesScanned) {
        totalFiles += data.filesScanned;
      }
    });
    
    // Group issues by severity
    const highSeverity = allIssues.filter(i => i.severity === 'high');
    const mediumSeverity = allIssues.filter(i => i.severity === 'medium');
    const lowSeverity = allIssues.filter(i => i.severity === 'low');
    const infoSeverity = allIssues.filter(i => i.severity === 'info');
    
    return {
      timestamp: new Date().toISOString(),
      totalFiles,
      totalIssues: allIssues.length,
      summary: {
        bySeverity: {
          high: highSeverity.length,
          medium: mediumSeverity.length,
          low: lowSeverity.length,
          info: infoSeverity.length
        },
        byType: {
          security: allIssues.filter(i => i.type === 'security').length,
          quality: allIssues.filter(i => i.type === 'quality').length,
          dependency: allIssues.filter(i => i.type === 'dependency').length
        }
      },
      issues: {
        high: highSeverity,
        medium: mediumSeverity,
        low: lowSeverity,
        info: infoSeverity
      },
      recommendations: this.generateRecommendations(allIssues)
    };
  }

  generateRecommendations(issues) {
    const recommendations = [];
    
    // Security recommendations
    const securityIssues = issues.filter(i => i.type === 'security');
    if (securityIssues.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'High',
        message: `Found ${securityIssues.length} security issues. Review and fix all hardcoded secrets, eval usage, and other security vulnerabilities.`
      });
    }
    
    // Code quality recommendations
    const qualityIssues = issues.filter(i => i.type === 'quality');
    if (qualityIssues.length > 0) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'Medium',
        message: `Found ${qualityIssues.length} code quality issues. Consider implementing a logging framework and addressing TODO items.`
      });
    }
    
    return recommendations;
  }

  generateMarkdownReport(auditReport) {
    let md = '# Code Audit Report\n\n';
    md += `**Generated:** ${new Date(auditReport.timestamp).toLocaleString()}\n\n`;
    
    md += '## Summary\n\n';
    md += `- **Total Files Audited:** ${auditReport.totalFiles}\n`;
    md += `- **Total Issues Found:** ${auditReport.totalIssues}\n\n`;
    
    md += '### Issues by Severity\n\n';
    md += `- 🔴 High: ${auditReport.summary.bySeverity.high}\n`;
    md += `- 🟡 Medium: ${auditReport.summary.bySeverity.medium}\n`;
    md += `- 🟢 Low: ${auditReport.summary.bySeverity.low}\n`;
    md += `- ℹ️ Info: ${auditReport.summary.bySeverity.info}\n\n`;
    
    md += '### Issues by Type\n\n';
    md += `- 🔒 Security: ${auditReport.summary.byType.security}\n`;
    md += `- 📝 Code Quality: ${auditReport.summary.byType.quality}\n`;
    md += `- 📦 Dependencies: ${auditReport.summary.byType.dependency}\n\n`;
    
    if (auditReport.recommendations.length > 0) {
      md += '## Recommendations\n\n';
      auditReport.recommendations.forEach(rec => {
        md += `### ${rec.category} (${rec.priority} Priority)\n\n`;
        md += `${rec.message}\n\n`;
      });
    }
    
    // Add detailed issues
    if (auditReport.issues.high.length > 0) {
      md += '## High Severity Issues\n\n';
      auditReport.issues.high.forEach((issue, idx) => {
        md += `### ${idx + 1}. ${issue.message}\n\n`;
        md += `- **File:** \`${issue.file}\`\n`;
        md += `- **Line:** ${issue.line}\n`;
        md += `- **Rule:** ${issue.rule}\n`;
        if (issue.code) {
          md += `- **Code:** \`${issue.code}\`\n`;
        }
        md += '\n';
      });
    }
    
    return md;
  }
}

async function main() {
  const config = require('../config.json');
  const auditor = new CodeAuditor(config);
  
  try {
    await auditor.generateAuditReport();
  } catch (error) {
    console.error('Failed to generate audit report:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CodeAuditor };
