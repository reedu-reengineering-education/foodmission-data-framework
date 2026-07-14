#!/usr/bin/env ts-node

import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import {
  collectLeafKeys,
  extractPlaceholders,
  getValueByPath,
  isErrnoWithCode,
  localeNamespaceFilePath,
  readJsonFile,
  resolveLocaleLayout,
  resolveLocaleWorkItems,
  sameStringArray,
  toError,
} from './utils';

function formatPreview(keys: string[]): string {
  const preview = keys.slice(0, 10).join(', ');
  return keys.length > 10 ? `${preview} ...` : preview;
}

function validateBaseLocale(errors: string[]): string[] {
  const { namespaceFiles } = resolveLocaleLayout();

  for (const namespaceFile of namespaceFiles) {
    const baseFilePath = localeNamespaceFilePath(DEFAULT_LOCALE, namespaceFile);

    let baseJson;
    try {
      baseJson = readJsonFile(baseFilePath);
    } catch (error) {
      errors.push(
        `${DEFAULT_LOCALE}/${namespaceFile}: Invalid JSON (${toError(error).message})`,
      );
      continue;
    }

    for (const key of collectLeafKeys(baseJson)) {
      const value = getValueByPath(baseJson, key);

      if (typeof value !== 'string') {
        errors.push(
          `${DEFAULT_LOCALE}/${namespaceFile}: Non-string value at "${key}"`,
        );
        continue;
      }

      if (value.trim().length === 0) {
        errors.push(
          `${DEFAULT_LOCALE}/${namespaceFile}: Empty value at "${key}"`,
        );
      }
    }
  }

  return namespaceFiles;
}

function validateLocaleParity(errors: string[]): void {
  const workItems = resolveLocaleWorkItems(DEFAULT_LOCALE);
  const { locales, namespaceFiles } = workItems;

  for (const locale of locales) {
    for (const namespaceFile of namespaceFiles) {
      const baseFilePath = localeNamespaceFilePath(
        DEFAULT_LOCALE,
        namespaceFile,
      );
      const localeFilePath = localeNamespaceFilePath(locale, namespaceFile);

      let baseJson;
      let localeJson;

      try {
        baseJson = readJsonFile(baseFilePath);
      } catch (error) {
        errors.push(
          `${DEFAULT_LOCALE}/${namespaceFile}: Invalid JSON (${toError(error).message})`,
        );
        continue;
      }

      try {
        localeJson = readJsonFile(localeFilePath);
      } catch (error) {
        if (isErrnoWithCode(error, 'ENOENT')) {
          errors.push(`${locale}/${namespaceFile}: Missing namespace file`);
          continue;
        }

        errors.push(
          `${locale}/${namespaceFile}: Invalid JSON (${toError(error).message})`,
        );
        continue;
      }

      const baseKeys = new Set(collectLeafKeys(baseJson));
      const localeKeys = new Set(collectLeafKeys(localeJson));

      const missingKeys = Array.from(baseKeys).filter(
        (key) => !localeKeys.has(key),
      );
      const extraKeys = Array.from(localeKeys).filter(
        (key) => !baseKeys.has(key),
      );

      if (missingKeys.length > 0) {
        errors.push(
          `${locale}/${namespaceFile}: Missing keys (${missingKeys.length}) -> ${formatPreview(missingKeys)}`,
        );
      }

      if (extraKeys.length > 0) {
        errors.push(
          `${locale}/${namespaceFile}: Extra keys (${extraKeys.length}) -> ${formatPreview(extraKeys)}`,
        );
      }

      const sharedKeys = Array.from(baseKeys).filter((key) =>
        localeKeys.has(key),
      );
      for (const key of sharedKeys) {
        const baseValue = getValueByPath(baseJson, key);
        const localeValue = getValueByPath(localeJson, key);

        if (typeof baseValue !== 'string' || typeof localeValue !== 'string') {
          continue;
        }

        const basePlaceholders = extractPlaceholders(baseValue);
        const localePlaceholders = extractPlaceholders(localeValue);

        if (!sameStringArray(basePlaceholders, localePlaceholders)) {
          errors.push(
            `${locale}/${namespaceFile}: Placeholder mismatch at "${key}" -> base [${basePlaceholders.join(', ')}], locale [${localePlaceholders.join(', ')}]`,
          );
        }
      }
    }
  }
}

function main(): void {
  const validateAllLocales = process.argv.includes('--all-locales');
  const errors: string[] = [];

  try {
    const namespaceFiles = validateBaseLocale(errors);

    if (validateAllLocales) {
      validateLocaleParity(errors);
    }

    if (errors.length > 0) {
      console.error('❌ Translation validation failed:\n');
      errors.forEach((error) => console.error(`- ${error}`));
      process.exit(1);
    }

    if (validateAllLocales) {
      const { locales } = resolveLocaleWorkItems(DEFAULT_LOCALE);
      console.log(
        `✅ Translation validation passed for ${locales.length + 1} locales and ${namespaceFiles.length} namespace files.`,
      );
      return;
    }

    console.log(
      `✅ Base locale (${DEFAULT_LOCALE}) validation passed for ${namespaceFiles.length} namespace files.`,
    );
    console.log(
      'ℹ️  Other locales are not checked in CI; missing keys fall back to English at runtime.',
    );
    console.log('ℹ️  Run `npm run i18n:validate:locales` to check full locale parity.');
  } catch (error) {
    console.error(`❌ ${toError(error).message}`);
    process.exit(1);
  }
}

main();
