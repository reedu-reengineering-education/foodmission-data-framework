#!/usr/bin/env node

/**
 * Test Coverage Quality Gates
 * This script checks if test coverage meets the required thresholds
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const REQUIRED_COVERAGE = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
};

function checkCoverage() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found. Run tests with coverage first.');
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const total = coverage.total;

  console.log('📊 Test Coverage Report');
  console.log('========================');
  
  let passed = true;
  
  Object.keys(REQUIRED_COVERAGE).forEach(metric => {
    const actual = total[metric].pct;
    const required = REQUIRED_COVERAGE[metric];
    const status = actual >= required ? '✅' : '❌';
    
    if (actual < required) {
      passed = false;
    }
    
    console.log(`${status} ${metric.padEnd(12)}: ${actual.toFixed(2)}% (required: ${required}%)`);
  });
  
  console.log('========================');
  
  if (passed) {
    console.log('✅ All coverage thresholds met!');
    process.exit(0);
  } else {
    console.log('❌ Coverage thresholds not met. Please add more tests.');
    process.exit(1);
  }
}

checkCoverage();