#!/usr/bin/env ts-node

import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import {
  collectLeafKeys,
  isErrnoWithCode,
  localeNamespaceFilePath,
  readJsonFile,
  resolveLocaleWorkItems,
  toError,
} from './utils';

function main(): void {
  let locales: string[] = [];
  let namespaceFiles: string[] = [];

  try {
    const workItems = resolveLocaleWorkItems(DEFAULT_LOCALE);
    locales = workItems.locales;
    namespaceFiles = workItems.namespaceFiles;
  } catch (error) {
    console.error(`❌ ${toError(error).message}`);
    process.exit(1);
  }

  for (const locale of locales) {
    console.log(`\n📄 Locale: ${locale}`);
    console.log('--------------------------------------------------');

    let localeMissingTotal = 0;

    for (const namespaceFile of namespaceFiles) {
      const baseFilePath = localeNamespaceFilePath(
        DEFAULT_LOCALE,
        namespaceFile,
      );
      const localeFilePath = localeNamespaceFilePath(locale, namespaceFile);

      let baseKeys: Set<string>;
      try {
        baseKeys = new Set(collectLeafKeys(readJsonFile(baseFilePath)));
      } catch (error) {
        console.error(
          `  ${DEFAULT_LOCALE}/${namespaceFile}: failed to read base namespace (${toError(error).message})`,
        );
        process.exit(1);
      }

      let localeKeys: Set<string>;
      try {
        localeKeys = new Set(collectLeafKeys(readJsonFile(localeFilePath)));
      } catch (error) {
        if (isErrnoWithCode(error, 'ENOENT')) {
          localeMissingTotal += baseKeys.size;
          console.log(
            `  ${namespaceFile}: missing file (${baseKeys.size} keys)`,
          );
          continue;
        }

        console.error(
          `  ${locale}/${namespaceFile}: failed to read namespace (${toError(error).message})`,
        );
        process.exit(1);
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
