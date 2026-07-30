import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../../src/i18n/constants';
import { CONSENTS_DATA_DIR } from './consents';

/**
 * Consent form translations live next to the consent seed data:
 *
 *   prisma/seeds/data/consents/translations/<locale>.json
 *
 * Shape:
 * {
 *   "privacy_notice": { "title": "...", "body": "..." }
 * }
 */

export type ConsentTranslationFile = Record<
  string,
  { title?: string; body?: string }
>;

export const CONSENT_TRANSLATIONS_DIR = path.join(
  CONSENTS_DATA_DIR,
  'translations',
);

export const TRANSLATED_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

export function consentTranslationsDir(): string {
  return path.join(process.cwd(), CONSENT_TRANSLATIONS_DIR);
}

export function loadConsentTranslationFile(
  locale: string,
): ConsentTranslationFile {
  const filePath = path.join(consentTranslationsDir(), `${locale}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ConsentTranslationFile;
}

export type ConsentTranslationReport = {
  upserted: number;
  unknownForms: string[];
  missingTranslations: string[];
};

/**
 * Load consent form translations into `entity_translations`.
 * Idempotent — existing rows are overwritten.
 */
export async function seedConsentTranslations(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {},
): Promise<ConsentTranslationReport> {
  const dryRun = options.dryRun ?? false;
  const report: ConsentTranslationReport = {
    upserted: 0,
    unknownForms: [],
    missingTranslations: [],
  };

  const forms = await prisma.consentForm.findMany();
  const formByKey = new Map(forms.map((f) => [f.key, f]));

  for (const locale of TRANSLATED_LOCALES) {
    const filePath = path.join(consentTranslationsDir(), `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      report.missingTranslations.push(`${locale}: translation file missing`);
      continue;
    }

    const translations = loadConsentTranslationFile(locale);

    for (const [formKey, fields] of Object.entries(translations)) {
      const form = formByKey.get(formKey);
      if (!form) {
        report.unknownForms.push(`${locale}/${formKey}`);
        continue;
      }

      for (const field of ['title', 'body'] as const) {
        const value = fields[field];
        if (!value) {
          continue;
        }

        if (!dryRun) {
          await prisma.entityTranslation.upsert({
            where: {
              entityType_entityId_locale_field: {
                entityType: 'ConsentForm',
                entityId: form.id,
                locale,
                field,
              },
            },
            create: {
              entityType: 'ConsentForm',
              entityId: form.id,
              locale,
              field,
              value,
            },
            update: { value },
          });
        }
        report.upserted += 1;
      }
    }

    for (const form of forms) {
      const entry = translations[form.key];
      if (!entry?.title) {
        report.missingTranslations.push(`${locale}/${form.key}/title`);
      }
      if (!entry?.body) {
        report.missingTranslations.push(`${locale}/${form.key}/body`);
      }
    }
  }

  return report;
}

export function printConsentTranslationReport(
  report: ConsentTranslationReport,
): void {
  console.log(`  upserted: ${report.upserted}`);
  if (report.unknownForms.length > 0) {
    console.log(`  unknown forms: ${report.unknownForms.length}`);
  }
  if (report.missingTranslations.length > 0) {
    console.log(
      `  missing translations: ${report.missingTranslations.length}`,
    );
  }
}
