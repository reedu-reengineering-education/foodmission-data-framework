#!/usr/bin/env ts-node

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  importTranslations,
  printImportReport,
} from './translation-io';
import { toError } from './utils';

function parseArgs(): { file?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let file: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--file') {
      file = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { file, dryRun };
}

function main(): void {
  try {
    const cli = parseArgs();
    if (!cli.file) {
      throw new Error('Missing required --file argument');
    }

    const report = importTranslations({ file: cli.file, dryRun: cli.dryRun });
    printImportReport(report);

    const reportPath = `${cli.file}.import-report.json`;
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`\nReport written to ${reportPath}`);

    if (report.skipped.placeholder_mismatch.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ ${toError(error).message}`);
    process.exit(1);
  }
}

main();
