/**
 * Derives a kebab-case slug from the English survey title. Unlike `title`
 * (which is overlaid with the translated value when `lang` is set), the slug
 * is unaffected by locale — but it is NOT a permanent identifier: it is
 * recomputed from `title` on every read, not stored, so renaming a survey's
 * English title via PATCH /surveys/:id changes its slug too. Safe to rely on
 * as long as titles are treated as fixed labels (which is how the seeded
 * surveys are used today); if titles start changing, persist a real slug
 * column instead.
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
