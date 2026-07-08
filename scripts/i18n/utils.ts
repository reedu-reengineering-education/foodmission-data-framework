import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_LOCALE } from '../../src/i18n/constants';

export type JsonObject = Record<string, unknown>;

const projectRoot = path.resolve(__dirname, '../..');
export const localesPath = path.join(projectRoot, 'src', 'i18n');

export interface LocaleLayout {
  locales: string[];
  baseLocalePath: string;
  namespaceFiles: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJsonFile(filePath: string): JsonObject {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!isObject(parsed)) {
    throw new Error('Top-level JSON value must be an object');
  }
  return parsed;
}

export function collectLeafKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (fullKey.startsWith('_meta')) {
      continue;
    }

    if (isObject(value)) {
      keys.push(...collectLeafKeys(value, fullKey));
      continue;
    }

    keys.push(fullKey);
  }

  return keys;
}

export function getValueByPath(obj: JsonObject, dottedPath: string): unknown {
  const parts = dottedPath.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isObject(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

export function extractPlaceholders(value: string): string[] {
  const pattern = /{{\s*([^}]+?)\s*}}/g;
  const placeholders = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders).sort();
}

function listLocaleDirectories(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listJsonFiles(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
}

export function resolveLocaleLayout(): LocaleLayout {
  if (!fs.existsSync(localesPath)) {
    throw new Error(`Locale folder not found: ${localesPath}`);
  }

  const locales = listLocaleDirectories(localesPath);
  if (!locales.includes(DEFAULT_LOCALE)) {
    throw new Error(
      `Base locale "${DEFAULT_LOCALE}" not found under ${localesPath}`,
    );
  }

  const baseLocalePath = path.join(localesPath, DEFAULT_LOCALE);
  const namespaceFiles = listJsonFiles(baseLocalePath);

  if (namespaceFiles.length === 0) {
    throw new Error(
      `No JSON namespace files found in base locale: ${baseLocalePath}`,
    );
  }

  return {
    locales,
    baseLocalePath,
    namespaceFiles,
  };
}

export function localeNamespaceFilePath(
  locale: string,
  namespaceFile: string,
): string {
  return path.join(localesPath, locale, namespaceFile);
}
