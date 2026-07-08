#!/usr/bin/env ts-node

import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import {
  collectLeafKeys,
  extractPlaceholders,
  getValueByPath,
  localeNamespaceFilePath,
  readJsonFile,
  resolveLocaleLayout,
} from './utils';

function formatPreview(keys: string[]): string {
  const preview = keys.slice(0, 10).join(', ');
  return keys.length > 10 ? `${preview} ...` : preview;
}

function main(): void {
  const errors: string[] = [];
  let locales: string[] = [];
  let namespaceFiles: string[] = [];

  try {
    const layout = resolveLocaleLayout();
    locales = layout.locales;
    namespaceFiles = layout.namespaceFiles;
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    process.exit(1);
  }

  for (const locale of locales) {
    if (locale === DEFAULT_LOCALE) {
      continue;
    }

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
          `${DEFAULT_LOCALE}/${namespaceFile}: Invalid JSON (${(error as Error).message})`,
        );
        continue;
      }

      try {
        localeJson = readJsonFile(localeFilePath);
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes('ENOENT')) {
          errors.push(`${locale}/${namespaceFile}: Missing namespace file`);
          continue;
        }

        errors.push(`${locale}/${namespaceFile}: Invalid JSON (${message})`);
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

        if (
          JSON.stringify(basePlaceholders) !==
          JSON.stringify(localePlaceholders)
        ) {
          errors.push(
            `${locale}/${namespaceFile}: Placeholder mismatch at "${key}" -> base [${basePlaceholders.join(', ')}], locale [${localePlaceholders.join(', ')}]`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Translation validation failed:\n');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(
    `✅ Translation validation passed for ${locales.length} locales and ${namespaceFiles.length} namespace files.`,
  );
}

main();
