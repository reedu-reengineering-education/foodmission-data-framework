#!/usr/bin/env ts-node

import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import {
  collectLeafKeys,
  localeNamespaceFilePath,
  readJsonFile,
  resolveLocaleLayout,
} from './utils';

function main(): void {
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

    console.log(`\n📄 Locale: ${locale}`);
    console.log('--------------------------------------------------');

    let localeMissingTotal = 0;

    for (const namespaceFile of namespaceFiles) {
      const baseFilePath = localeNamespaceFilePath(
        DEFAULT_LOCALE,
        namespaceFile,
      );
      const localeFilePath = localeNamespaceFilePath(locale, namespaceFile);

      const baseKeys = new Set(collectLeafKeys(readJsonFile(baseFilePath)));

      let localeKeys: Set<string>;
      try {
        localeKeys = new Set(collectLeafKeys(readJsonFile(localeFilePath)));
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes('ENOENT')) {
          localeMissingTotal += baseKeys.size;
          console.log(
            `  ${namespaceFile}: missing file (${baseKeys.size} keys)`,
          );
          continue;
        }

        throw error;
      }

      const missing = Array.from(baseKeys).filter(
        (key) => !localeKeys.has(key),
      );

      if (missing.length > 0) {
        localeMissingTotal += missing.length;
        console.log(`  ${namespaceFile}: ${missing.length} missing keys`);
        missing.forEach((key) => console.log(`    - ${key}`));
      }
    }

    if (localeMissingTotal === 0) {
      console.log('  ✅ No missing keys');
    } else {
      console.log(`  ⚠️  Total missing keys: ${localeMissingTotal}`);
    }
  }
}

main();
