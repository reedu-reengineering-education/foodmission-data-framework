#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import {
  buildConsentFormExportSheets,
  buildGenericFoodExportSheets,
  DEFAULT_CONSENT_EXPORT_FIELDS,
  DEFAULT_ENTITY_HANDOFF_PATH,
  DEFAULT_GENERIC_FOOD_EXPORT_FIELDS,
  parseCsvList,
  printEntityExportReport,
  resolveTargetLocales,
  runScript,
  writeReportFile,
  writeSpreadsheet,
} from './entity-translation-handoff';
import {
  isTranslatableEntityType,
  type TranslatableEntityType,
} from '../../src/translations/entity-types';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: DEFAULT_ENTITY_HANDOFF_PATH },
      format: { type: 'string', default: 'xlsx' },
      locales: { type: 'string' },
      fields: { type: 'string' },
      entity: { type: 'string', default: 'GenericFood' },
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

  const entityArg = values.entity ?? 'GenericFood';
  if (!isTranslatableEntityType(entityArg)) {
    throw new Error(
      `--entity must be a translatable entity type (got "${entityArg}")`,
    );
  }
  const entityType = entityArg as TranslatableEntityType;
  if (entityType !== 'GenericFood' && entityType !== 'ConsentForm') {
    throw new Error(
      `--entity currently supports GenericFood and ConsentForm (got "${entityType}")`,
    );
  }

  let out = values.out ?? DEFAULT_ENTITY_HANDOFF_PATH;
  if (format === 'csv' && out.endsWith('.xlsx')) {
    out = out.replace(/\.xlsx$/i, '.csv');
  }
  if (entityType === 'ConsentForm' && out === DEFAULT_ENTITY_HANDOFF_PATH) {
    out = out.replace(/entity-handoff\.xlsx$/i, 'consent-handoff.xlsx');
  }

  const requestedLocales = parseCsvList(values.locales);
  let locales = resolveTargetLocales(requestedLocales);
  if (!requestedLocales?.length && !values['include-nl']) {
    locales = locales.filter((locale) => locale !== 'nl');
  }

  const defaultFields =
    entityType === 'ConsentForm'
      ? [...DEFAULT_CONSENT_EXPORT_FIELDS]
      : [...DEFAULT_GENERIC_FOOD_EXPORT_FIELDS];
  const fields = parseCsvList(values.fields) ?? defaultFields;

  const prisma = new PrismaClient();
  try {
    const { sheets, report } =
      entityType === 'ConsentForm'
        ? await buildConsentFormExportSheets(prisma, {
            out,
            format,
            locales,
            entityType,
            fields,
          })
        : await buildGenericFoodExportSheets(prisma, {
            out,
            format,
            locales,
            entityType,
            fields,
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
