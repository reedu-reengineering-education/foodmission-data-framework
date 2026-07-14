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

export interface LocaleWorkItems {
  locales: string[];
  namespaceFiles: string[];
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function isErrnoWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === code
  );
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

    if (fullKey === 'meta' || fullKey.startsWith('meta.')) {
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

export function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
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

export function resolveLocaleWorkItems(
  baseLocale: string = DEFAULT_LOCALE,
): LocaleWorkItems {
  const layout = resolveLocaleLayout();
  return {
    locales: layout.locales.filter((locale) => locale !== baseLocale),
    namespaceFiles: layout.namespaceFiles,
  };
}

export function localeNamespaceFilePath(
  locale: string,
  namespaceFile: string,
): string {
  return path.join(localesPath, locale, namespaceFile);
}

export function namespaceFromFile(namespaceFile: string): string {
  return namespaceFile.replace(/\.json$/i, '');
}

export function setValueByPath(
  obj: JsonObject,
  dottedPath: string,
  value: string,
): void {
  const parts = dottedPath.split('.');
  let current: JsonObject = obj;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = current[part];
    if (!isObject(next)) {
      current[part] = {};
    }
    current = current[part] as JsonObject;
  }

  current[parts[parts.length - 1]] = value;
}

export function writeJsonFile(filePath: string, obj: JsonObject): void {
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

export function readLocaleNamespace(
  locale: string,
  namespaceFile: string,
): JsonObject {
  return readJsonFile(localeNamespaceFilePath(locale, namespaceFile));
}

export function getStringAtPath(
  obj: JsonObject,
  dottedPath: string,
): string | undefined {
  const value = getValueByPath(obj, dottedPath);
  return typeof value === 'string' ? value : undefined;
}

export function ensureMetaBlock(
  obj: JsonObject,
  locale: string,
  lastImportedAt?: string,
): void {
  const meta: JsonObject = isObject(obj.meta) ? { ...obj.meta } : {};
  meta.locale = locale;
  if (lastImportedAt !== undefined) {
    meta.lastImportedAt = lastImportedAt;
  } else if (!('lastImportedAt' in meta)) {
    delete meta.lastImportedAt;
  }
  obj.meta = meta;
}
