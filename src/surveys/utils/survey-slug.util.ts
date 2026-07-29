/**
 * Derives a stable kebab-case slug from the English survey title.
 * Unlike `title` (which is overlaid with the translated value when `lang` is
 * set), the slug never changes — clients can use it as a fixed identifier.
 *
 * Examples:
 *   "third use" → "third-use"
 *   "after 1 m and at least 9th use" → "after-1-m-and-at-least-9th-use"
 */
export function toSurveySlug(englishTitle: string): string {
  return englishTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
