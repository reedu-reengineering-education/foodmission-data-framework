import { DEFAULT_LOCALE } from '../../i18n/constants';

const IMAGE_BASE_URL = 'https://images.openfoodfacts.org/images/products';

export type OffImageType = 'front' | 'nutrition' | 'ingredients';

/**
 * URL of a selected product image (400 px display size).
 *
 * The live OFF API adds `image_url`/`image_front_url`/... when rendering a
 * response; the stored documents in the local Mongo clone only have the
 * `images` map. Reads `images.selected.<type>.<lc>` (schema 1001+) and
 * legacy `images.<type>_<lc>`, picking the requested language, then the
 * product's main language, then English, then any.
 */
export function offImageUrl(
  product: Record<string, unknown>,
  type: OffImageType,
  lang: string = DEFAULT_LOCALE,
): string | undefined {
  const code = typeof product._id === 'string' ? product._id : undefined;
  const images = asRecord(product.images);
  if (!code || !images) return undefined;

  const selected = asRecord(asRecord(images.selected)?.[type]);
  const revByLang = (lc: string): unknown =>
    asRecord(selected?.[lc])?.rev ?? asRecord(images[`${type}_${lc}`])?.rev;

  const candidates = [lang, product.lc, product.lang, DEFAULT_LOCALE]
    .filter((lc): lc is string => typeof lc === 'string' && lc.length > 0)
    .concat(
      Object.keys(selected ?? {}),
      Object.keys(images)
        .filter((key) => key.startsWith(`${type}_`))
        .map((key) => key.slice(type.length + 1)),
    );

  for (const lc of candidates) {
    const rev = revByLang(lc);
    if (typeof rev === 'string' || typeof rev === 'number') {
      return `${IMAGE_BASE_URL}/${offProductPath(code)}/${type}_${lc}.${rev}.400.jpg`;
    }
  }
  return undefined;
}

/**
 * Folder of a product's images: barcodes longer than 8 digits are left-padded
 * to 13 and split 3/3/3/rest, shorter ones are used as is.
 */
export function offProductPath(code: string): string {
  if (!/^\d+$/.test(code) || code.length <= 8) return code;
  const padded = code.padStart(13, '0');
  const match = /^(\d{3})(\d{3})(\d{3})(\d+)$/.exec(padded);
  return match ? match.slice(1).join('/') : code;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
