import { DEFAULT_LOCALE } from '../../i18n/constants';

/**
 * Pick a localized string from an Open Food Facts product document.
 *
 * Fallback chain:
 *   `{field}_{lang}` → `{field}_en` → bare `{field}` → `{field}_languages[lang]`
 */
export function pickLocalizedString(
  product: Record<string, unknown>,
  baseField: string,
  lang: string = DEFAULT_LOCALE,
): string | undefined {
  const locale = (lang || DEFAULT_LOCALE).trim().toLowerCase();

  const fromSuffix = asNonEmptyString(product[`${baseField}_${locale}`]);
  if (fromSuffix) return fromSuffix;

  if (locale !== DEFAULT_LOCALE) {
    const fromEn = asNonEmptyString(product[`${baseField}_${DEFAULT_LOCALE}`]);
    if (fromEn) return fromEn;
  }

  const bare = asNonEmptyString(product[baseField]);
  if (bare) return bare;

  const languages = product[`${baseField}_languages`];
  if (languages && typeof languages === 'object' && !Array.isArray(languages)) {
    const map = languages as Record<string, unknown>;
    const fromMap = asNonEmptyString(map[locale]);
    if (fromMap) return fromMap;
  }

  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
