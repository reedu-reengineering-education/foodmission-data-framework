#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import {
  DEFAULT_ENTITY_HANDOFF_PATH,
  importEntityTranslations,
  printEntityImportReport,
  runScript,
  writeReportFile,
} from './entity-translation-handoff';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_ENTITY_HANDOFF_PATH },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const file = values.file ?? DEFAULT_ENTITY_HANDOFF_PATH;
  const prisma = new PrismaClient();

  try {
    const report = await importEntityTranslations(prisma, {
      file,
      dryRun: values['dry-run'] ?? false,
    });
    printEntityImportReport(report);

    const reportPath = `${file}.import-report.json`;
    writeReportFile(reportPath, report);
    console.log(`\nReport written to ${reportPath}`);

    if (report.skipped.invalid_key.length > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runScript(main);
