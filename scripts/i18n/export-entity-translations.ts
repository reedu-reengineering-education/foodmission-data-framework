#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import {
  isTranslatableEntityType,
  type TranslatableEntityType,
} from '../../src/translations/entity-types';
import {
  buildEntityExportSheets,
  DEFAULT_DB_HANDOFF_ENTITY_TYPES,
  DEFAULT_ENTITY_HANDOFF_PATH,
  DEFAULT_GENERIC_FOOD_EXPORT_FIELDS,
  parseCsvList,
  printEntityExportReport,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
} from './entity-translation-handoff';

function parseEntityTypes(
  value: string | undefined,
): TranslatableEntityType[] {
  const requested = parseCsvList(value);
  if (!requested?.length) {
    return [...DEFAULT_DB_HANDOFF_ENTITY_TYPES];
  }

  const types: TranslatableEntityType[] = [];
  for (const item of requested) {
    if (!isTranslatableEntityType(item)) {
      throw new Error(
        `Unsupported entity type "${item}". Allowed: ${DEFAULT_DB_HANDOFF_ENTITY_TYPES.join(', ')}`,
      );
    }
    if (!(DEFAULT_DB_HANDOFF_ENTITY_TYPES as readonly string[]).includes(item)) {
      throw new Error(
        `Entity type "${item}" is not part of DB handoff. Allowed: ${DEFAULT_DB_HANDOFF_ENTITY_TYPES.join(', ')}`,
      );
    }
    types.push(item);
  }
  return types;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: DEFAULT_ENTITY_HANDOFF_PATH },
      format: { type: 'string', default: 'xlsx' },
      locales: { type: 'string' },
      fields: { type: 'string' },
      /**
       * Comma-separated entity types. Default: GenericFood + learning catalog
       * (Dimension, Topic, FoodFact, Quiz, QuizOption, Mission, Challenge,
       * Quest, MicroLearning).
       */
      entities: { type: 'string' },
      /**
       * By default export all non-English locales except nl (usually loaded via
       * db:translations). Pass --include-nl to also export Dutch.
       */
      'include-nl': { type: 'boolean', default: false },
    },
  });

  const format: 'xlsx' | 'csv' = values.format === 'csv' ? 'csv' : 'xlsx';
  if (values.format !== 'xlsx' && values.format !== 'csv') {
    throw new Error('--format must be xlsx or csv');
  }

  let out = values.out ?? DEFAULT_ENTITY_HANDOFF_PATH;
  if (format === 'csv' && out.endsWith('.xlsx')) {
    out = out.replace(/\.xlsx$/i, '.csv');
  }

  const requestedLocales = parseCsvList(values.locales);
  let locales = resolveTargetLocales(requestedLocales);
  if (!requestedLocales?.length && !values['include-nl']) {
    locales = locales.filter((locale) => locale !== 'nl');
  }

  const genericFoodFields =
    parseCsvList(values.fields) ?? [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS];
  const entityTypes = parseEntityTypes(values.entities);

  const prisma = new PrismaClient();
  try {
    const { sheets, report } = await buildEntityExportSheets(prisma, {
      out,
      format,
      locales,
      entityTypes,
      genericFoodFields,
    });

    await writeSpreadsheet(sheets, out, format);

    const reportPath = `${out}.report.json`;
    writeReportFile(reportPath, report);
    printEntityExportReport(report);
    console.log(`\nReport written to ${reportPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

runScript(main);
