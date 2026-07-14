#!/usr/bin/env ts-node

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildExportSheets,
  parseCsvList,
  printExportReport,
  resolveNamespaces,
  resolveTargetLocales,
  writeSpreadsheet,
} from './translation-io';
import { toError } from './utils';

function parseArgs(): {
  out: string;
  format: 'xlsx' | 'csv';
  locales?: string[];
  namespaces?: string[];
} {
  const args = process.argv.slice(2);
  let out = path.join('translations', 'handoff.xlsx');
  let format: 'xlsx' | 'csv' = 'xlsx';
  let locales: string[] | undefined;
  let namespaces: string[] | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out') {
      out = args[i + 1] ?? out;
      i += 1;
      continue;
    }
    if (arg === '--format') {
      const value = args[i + 1];
      if (value !== 'xlsx' && value !== 'csv') {
        throw new Error('--format must be xlsx or csv');
      }
      format = value;
      i += 1;
      continue;
    }
    if (arg === '--locales') {
      locales = parseCsvList(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--namespaces') {
      namespaces = parseCsvList(args[i + 1]);
      i += 1;
    }
  }

  if (format === 'csv' && out.endsWith('.xlsx')) {
    out = out.replace(/\.xlsx$/i, '.csv');
  }

  return { out, format, locales, namespaces };
}

function main(): void {
  try {
    const cli = parseArgs();
    const options = {
      out: cli.out,
      format: cli.format,
      locales: resolveTargetLocales(cli.locales),
      namespaces: resolveNamespaces(cli.namespaces),
    };

    const { sheets, report } = buildExportSheets(options);
    writeSpreadsheet(sheets, options.out, options.format);

    const reportPath = `${options.out}.report.json`;
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    printExportReport(report);
    console.log(`\nReport written to ${reportPath}`);
  } catch (error) {
    console.error(`❌ ${toError(error).message}`);
    process.exit(1);
  }
}

main();
