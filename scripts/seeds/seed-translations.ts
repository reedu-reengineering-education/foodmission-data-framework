#!/usr/bin/env ts-node

/**
 * Production/dev DB translations step.
 *
 * Run after migrations + seed:
 *   npm run db:migrate:deploy
 *   npm run db:seed:prod   # (or db:seed)
 *   npm run db:translations
 *
 * Loads NEVO food name overlays into `entity_translations`, and is the place
 * to add further DB translation imports later. Skips sources that already have
 * data unless `--force` is passed.
 */

import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_NEVO_TRANSLATIONS_CSV,
  importNevoCsv,
  printImportReport,
} from './import-nevo-translations';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: 'string', default: DEFAULT_NEVO_TRANSLATIONS_CSV },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      'batch-size': { type: 'string', default: '500' },
    },
  });

  const batchSize = Number.parseInt(values['batch-size'] ?? '500', 10);
  if (Number.isNaN(batchSize) || batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }

  const dryRun = values['dry-run'] ?? false;
  const skipExisting = !(values.force ?? false);

  console.log('🌐 Loading database translations...');
  console.log(`   dry-run: ${dryRun}`);
  console.log(`   skipExisting: ${skipExisting}`);
  console.log('=====================================');

  const prisma = new PrismaClient();
  try {
    // --- NEVO GenericFood locale overlays ---
    console.log('\n🥗 NEVO food translations');
    const nevoReport = await importNevoCsv(prisma, {
      file: values.file ?? DEFAULT_NEVO_TRANSLATIONS_CSV,
      dryRun,
      skipExisting,
      batchSize,
    });
    printImportReport(nevoReport);
    if (nevoReport.skippedUnknownNevoCode > 0) {
      process.exitCode = 1;
    }

    // Future DB translation sources (gamification, recipes, …) go here.

    console.log('\n=====================================');
    console.log('✅ Database translations step finished');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
