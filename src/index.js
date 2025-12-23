const { CodeScanner } = require('./scanner');
const { CodeAuditor } = require('./auditor');
const config = require('../config.json');

async function main() {
  const command = process.argv[2];
  
  console.log('=== Copilot Audit - Phase 2 ===\n');
  
  switch(command) {
    case 'scan':
      console.log('Running code scanner...\n');
      const scanner = require('./scanner');
      break;
      
    case 'audit':
      console.log('Running code auditor...\n');
      const auditor = require('./auditor');
      break;
      
    case 'all':
      console.log('Running full scan and audit...\n');
      await require('./scanner');
      console.log('\n');
      await require('./auditor');
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run scan  - Scan code for issues');
      console.log('  npm run audit - Generate audit report from scan results');
      console.log('  node src/index.js all - Run both scan and audit');
      console.log('\nFor more information, see README.md');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CodeScanner, CodeAuditor };
